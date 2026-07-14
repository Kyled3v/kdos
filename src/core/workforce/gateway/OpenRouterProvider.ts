/**
 * OpenRouterProvider.ts
 *
 * Location: src/core/workforce/gateway/OpenRouterProvider.ts
 *
 * OpenRouterProvider is the ONLY class in KDOS responsible for
 * communicating with OpenRouter. It implements the AIProvider
 * contract defined in AIGateway.ts exactly, backed by OpenRouter's
 * chat completions API.
 *
 * NOTE ON AIRequest SHAPE:
 * AIProvider, AIRequest, and AIResponse are imported from
 * AIGateway.ts rather than redefined here, per the existing
 * architecture rule that AIGateway.ts is the source of truth for
 * these types. This file assumes AIRequest exposes a `messages`
 * array of { role, content } chat messages (the standard shape any
 * OpenRouter-compatible request needs) and an optional
 * `temperature` override. If AIRequest's actual field names differ,
 * update `buildRequestBody` below accordingly — no other part of
 * this file depends on that detail.
 *
 * NOTE ON AIResponse.usage SHAPE:
 * AIResponse.usage's exact field names are not specified by the
 * task. This file maps OpenRouter's `usage` object
 * (prompt_tokens / completion_tokens / total_tokens) onto whatever
 * shape AIResponse['usage'] declares, passing the raw counts through.
 * If AIResponse['usage'] uses different field names, adjust
 * `mapUsage` below — no other part of this file depends on that
 * detail.
 */

import type { AIProvider, AIRequest, AIResponse } from './AIGateway'

/**
 * A single chat message in the OpenRouter/OpenAI-style chat
 * completions shape.
 */
interface OpenRouterChatMessage {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

/**
 * The request body sent to OpenRouter's chat completions endpoint.
 */
interface OpenRouterRequestBody {
  readonly model: string
  readonly messages: OpenRouterChatMessage[]
  readonly temperature: number
  readonly stream?: boolean
}

/**
 * A single choice returned by OpenRouter's chat completions endpoint.
 */
interface OpenRouterChoice {
  readonly message?: {
    readonly content?: string
  }
  readonly delta?: {
    readonly content?: string
  }
}

/**
 * Token usage as reported by OpenRouter.
 */
interface OpenRouterUsage {
  readonly prompt_tokens?: number
  readonly completion_tokens?: number
  readonly total_tokens?: number
}

/**
 * The successful, non-streaming response shape returned by
 * OpenRouter's chat completions endpoint.
 */
interface OpenRouterSuccessResponse {
  readonly model?: string
  readonly choices?: OpenRouterChoice[]
  readonly usage?: OpenRouterUsage
}

/**
 * The error shape OpenRouter returns in its response body when a
 * request fails.
 */
interface OpenRouterErrorResponse {
  readonly error?: {
    readonly message?: string
  }
}

/**
 * The OpenRouter chat completions endpoint.
 */
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * A lightweight, low-cost endpoint used to verify connectivity and
 * authentication for healthCheck().
 */
const OPENROUTER_MODELS_ENDPOINT = 'https://openrouter.ai/api/v1/models'

/**
 * Default model used when OPENROUTER_MODEL is not set in the
 * environment. This is the only model name permitted to be
 * hardcoded in this file.
 */
const DEFAULT_MODEL = 'moonshotai/kimi-k2'

/**
 * Fixed sampling temperature for all requests made through this
 * provider, unless overridden by the incoming AIRequest.
 */
const DEFAULT_TEMPERATURE = 0.2

/**
 * OpenRouterProvider
 *
 * Single responsibility: implement AIProvider against OpenRouter's
 * chat completions API.
 *
 * This class:
 *   - Reads OPENROUTER_API_KEY and OPENROUTER_MODEL from environment
 *     variables at call time (never hardcoded).
 *   - Falls back to "moonshotai/kimi-k2" when OPENROUTER_MODEL is
 *     unset.
 *   - Throws a descriptive Error, including HTTP status code, status
 *     text, and any message OpenRouter returned, whenever a request
 *     fails.
 *   - Throws "OPENROUTER_API_KEY is missing." when no API key is
 *     configured.
 *   - Returns AIResponse objects, never raw strings or JSON.
 *   - Uses no `any` types.
 */
export class OpenRouterProvider implements AIProvider {
  public readonly name = 'OpenRouter'

  /**
   * Sends a non-streaming chat completion request to OpenRouter and
   * returns the result as an AIResponse.
   *
   * @param request - The AIRequest to fulfill.
   * @returns The completed AIResponse.
   * @throws Error if OPENROUTER_API_KEY is missing, if the HTTP
   *         request fails, if OpenRouter returns a non-OK status, or
   *         if the response contains no usable message content.
   */
  public async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = this.requireApiKey()
    const model = this.resolveModel()
    const body = this.buildRequestBody(request, model, false)

    const response = await this.sendRequest(apiKey, body)
    const parsed = await this.parseSuccessBody(response)
    const content = this.extractContent(parsed)

    return {
      content,
      model: parsed.model ?? model,
      provider: this.name,
      usage: this.mapUsage(parsed.usage),
      raw: parsed,
    } as AIResponse
  }

  /**
   * Sends a streaming chat completion request to OpenRouter and
   * yields incremental content chunks as they arrive.
   *
   * @param request - The AIRequest to fulfill.
   * @yields Successive content deltas as plain strings.
   * @throws Error if OPENROUTER_API_KEY is missing, if the HTTP
   *         request fails, if OpenRouter returns a non-OK status, or
   *         if the response body cannot be streamed.
   */
  public async *stream(request: AIRequest): AsyncIterable<string> {
    const apiKey = this.requireApiKey()
    const model = this.resolveModel()
    const body = this.buildRequestBody(request, model, true)

    const response = await this.sendRequest(apiKey, body)

    if (!response.body) {
      throw new Error('OpenRouterProvider: streaming response contained no readable body.')
    }

    yield* this.readStream(response.body)
  }

  /**
   * Checks whether OpenRouter is reachable and the configured API
   * key is accepted. Never throws — returns false on any failure.
   *
   * @returns true if OpenRouter responded successfully, false
   *          otherwise.
   */
  public async healthCheck(): Promise<boolean> {
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      return false
    }

    try {
      const response = await fetch(OPENROUTER_MODELS_ENDPOINT, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'KDOS',
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Reads OPENROUTER_API_KEY from the environment, throwing the
   * exact required message if it is missing.
   */
  private requireApiKey(): string {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is missing.')
    }
    return apiKey
  }

  /**
   * Reads OPENROUTER_MODEL from the environment, falling back to
   * DEFAULT_MODEL when unset.
   */
  private resolveModel(): string {
    return process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL
  }

  /**
   * Builds the OpenRouter request body from an incoming AIRequest.
   */
  private buildRequestBody(
    request: AIRequest,
    model: string,
    stream: boolean
  ): OpenRouterRequestBody {
    const requestWithMessages = request as unknown as {
      messages: OpenRouterChatMessage[]
      temperature?: number
    }

    return {
      model,
      messages: requestWithMessages.messages,
      temperature: requestWithMessages.temperature ?? DEFAULT_TEMPERATURE,
      ...(stream ? { stream: true } : {}),
    }
  }

  /**
   * Performs the fetch() call to OpenRouter. Throws a descriptive
   * Error if the HTTP call fails outright or if OpenRouter responds
   * with a non-OK status.
   */
  private async sendRequest(apiKey: string, body: OpenRouterRequestBody): Promise<Response> {
    let response: Response

    try {
      response = await fetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'KDOS',
        },
        body: JSON.stringify(body),
      })
    } catch (networkError) {
      const reason =
        networkError instanceof Error ? networkError.message : String(networkError)
      throw new Error(`OpenRouterProvider: network request failed: ${reason}`)
    }

    if (!response.ok) {
      const returnedMessage = await this.extractErrorMessage(response)
      throw new Error(
        `OpenRouterProvider: request failed with status ${response.status} (${response.statusText}): ${returnedMessage}`
      )
    }

    return response
  }

  /**
   * Parses a successful, non-streaming response body as JSON.
   */
  private async parseSuccessBody(response: Response): Promise<OpenRouterSuccessResponse> {
    try {
      return (await response.json()) as OpenRouterSuccessResponse
    } catch (parseError) {
      const reason = parseError instanceof Error ? parseError.message : String(parseError)
      throw new Error(
        `OpenRouterProvider: failed to parse successful response body as JSON: ${reason}`
      )
    }
  }

  /**
   * Attempts to extract a human-readable error message from a failed
   * response body, falling back to raw text or a generic notice if
   * the body cannot be parsed as JSON or is empty.
   */
  private async extractErrorMessage(response: Response): Promise<string> {
    let rawText: string

    try {
      rawText = await response.text()
    } catch {
      return 'no response body available'
    }

    if (!rawText) {
      return 'no response body returned'
    }

    try {
      const parsed = JSON.parse(rawText) as OpenRouterErrorResponse
      return parsed.error?.message ?? rawText
    } catch {
      return rawText
    }
  }

  /**
   * Extracts the assistant's message content from a successful,
   * non-streaming OpenRouter response, throwing a descriptive Error
   * if the response contains no usable choice or content.
   */
  private extractContent(response: OpenRouterSuccessResponse): string {
    const content = response.choices?.[0]?.message?.content

    if (typeof content !== 'string' || content.length === 0) {
      throw new Error(
        'OpenRouterProvider: response succeeded but contained no assistant message content.'
      )
    }

    return content
  }

  /**
   * Maps OpenRouter's usage counts onto AIResponse['usage']. See the
   * file-level note on AIResponse.usage shape.
   */
  private mapUsage(usage: OpenRouterUsage | undefined): AIResponse['usage'] {
    return {
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    } as AIResponse['usage']
  }

  /**
   * Reads a streamed OpenRouter response body as server-sent events,
   * yielding each incremental content delta as it arrives and
   * stopping cleanly at the "[DONE]" sentinel.
   */
  private async *readStream(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const delta = this.parseStreamLine(line)
          if (delta !== null) {
            yield delta
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Parses a single server-sent-event line from an OpenRouter stream,
   * returning the content delta it carries, or null if the line
   * carries no content (including the "[DONE]" sentinel and
   * non-data lines).
   */
  private parseStreamLine(line: string): string | null {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) {
      return null
    }

    const payload = trimmed.slice('data:'.length).trim()
    if (payload === '[DONE]' || payload.length === 0) {
      return null
    }

    try {
      const parsed = JSON.parse(payload) as OpenRouterSuccessResponse
      const delta = parsed.choices?.[0]?.delta?.content
      return typeof delta === 'string' && delta.length > 0 ? delta : null
    } catch {
      return null
    }
  }
}