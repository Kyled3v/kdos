import OpenAI from "openai";
import type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIMessage,
} from "./AIGateway";

const BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Configuration options for constructing an OpenRouterProvider instance.
 */
export interface OpenRouterProviderConfig {
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
  readonly timeoutMs?: number;
}

/**
 * AIProvider adapter for OpenRouter. OpenRouter exposes an
 * OpenAI-compatible API, so this adapter uses the official OpenAI SDK
 * pointed at OpenRouter's endpoint. All OpenRouter-specific
 * configuration lives entirely inside this adapter, never inside the
 * gateway or an employee.
 */
export class OpenRouterProvider implements AIProvider {
  public readonly name = "openrouter";

  private readonly client: OpenAI;
  private readonly defaultModel: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly timeoutMs: number;

  public constructor(config?: OpenRouterProviderConfig) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OpenRouterProvider: OPENROUTER_API_KEY environment variable is not set."
      );
    }

    const defaultModel = process.env.OPENROUTER_MODEL;

    if (!defaultModel) {
      throw new Error(
        "OpenRouterProvider: OPENROUTER_MODEL environment variable is not set."
      );
    }

    this.timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    this.client = new OpenAI({
      apiKey,
      baseURL: BASE_URL,
      timeout: this.timeoutMs,
    });
    this.defaultModel = defaultModel;
    this.maxRetries = config?.maxRetries ?? 3;
    this.retryDelayMs = config?.retryDelayMs ?? 500;
  }

  /**
   * Sends a chat completion request to OpenRouter and returns a
   * normalised response. Retries on transient failures.
   */
  public async generate(request: AIRequest): Promise<AIResponse> {
    this.validateRequest(request);

    const model = request.model ?? this.defaultModel;

    return this.withRetries(async () => {
      let completion: OpenAI.Chat.Completions.ChatCompletion;

      try {
        completion = await this.client.chat.completions.create({
          model,
          messages: this.toOpenAIMessages(request.messages),
          max_tokens: request.maxTokens,
          temperature: request.temperature,
        });
      } catch (error) {
        throw this.toMeaningfulError(error, "generate");
      }

      const choice = completion.choices[0];

      if (!choice || !choice.message || choice.message.content === null) {
        throw new Error(
          "OpenRouterProvider: received an empty completion from OpenRouter."
        );
      }

      return {
        content: choice.message.content,
        model: completion.model,
        provider: this.name,
        usage: {
          inputTokens: completion.usage?.prompt_tokens ?? 0,
          outputTokens: completion.usage?.completion_tokens ?? 0,
        },
        raw: completion,
      };
    });
  }

  /**
   * Streams a chat completion from OpenRouter, yielding text chunks
   * as they arrive.
   */
  public stream(request: AIRequest): AsyncIterable<string> {
    this.validateRequest(request);

    const model = request.model ?? this.defaultModel;
    const client = this.client;
    const messages = this.toOpenAIMessages(request.messages);
    const maxTokens = request.maxTokens;
    const temperature = request.temperature;
    const toMeaningfulError = this.toMeaningfulError.bind(this);

    return {
      [Symbol.asyncIterator]() {
        let iterator: AsyncIterator<OpenAI.Chat.Completions.ChatCompletionChunk> | null =
          null;

        return {
          async next(): Promise<IteratorResult<string>> {
            try {
              if (iterator === null) {
                const stream = await client.chat.completions.create({
                  model,
                  messages,
                  max_tokens: maxTokens,
                  temperature,
                  stream: true,
                });

                iterator = stream[Symbol.asyncIterator]();
              }

              const result = await iterator.next();

              if (result.done) {
                return { done: true, value: undefined };
              }

              const delta = result.value.choices[0]?.delta?.content ?? "";

              return { done: false, value: delta };
            } catch (error) {
              throw toMeaningfulError(error, "stream");
            }
          },
        };
      },
    };
  }

  /**
   * Verifies connectivity and authentication with OpenRouter by
   * listing available models. Returns false rather than throwing on
   * failure.
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Converts normalised AIMessages into the shape expected by the
   * OpenAI SDK.
   */
  private toOpenAIMessages(
    messages: readonly AIMessage[]
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  /**
   * Validates the shape of an incoming request.
   */
  private validateRequest(request: AIRequest): void {
    if (!request) {
      throw new Error("OpenRouterProvider: request is required.");
    }

    if (!Array.isArray(request.messages) || request.messages.length === 0) {
      throw new Error(
        "OpenRouterProvider: request.messages must be a non-empty array."
      );
    }
  }

  /**
   * Retries an operation on transient errors (rate limits, timeouts,
   * server errors) using exponential backoff. Throws the last
   * encountered error if all retries are exhausted.
   */
  private async withRetries<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (!this.isRetryable(error) || attempt === this.maxRetries) {
          throw error;
        }

        const delay = this.retryDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Determines whether an error represents a transient failure that
   * is safe to retry, including request timeouts.
   */
  private isRetryable(error: unknown): boolean {
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return true;
    }

    if (error instanceof OpenAI.APIError) {
      const status = error.status;
      return status === 429 || (status !== undefined && status >= 500);
    }

    return false;
  }

  /**
   * Converts an SDK-level error into a meaningful, descriptive
   * exception for consumers of the gateway.
   */
  private toMeaningfulError(error: unknown, operation: string): Error {
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return new Error(
        `OpenRouterProvider: ${operation} timed out after ${this.timeoutMs}ms.`
      );
    }

    if (error instanceof OpenAI.APIError) {
      return new Error(
        `OpenRouterProvider: ${operation} failed with status ${error.status ?? "unknown"} - ${error.message}`
      );
    }

    if (error instanceof Error) {
      return new Error(
        `OpenRouterProvider: ${operation} failed - ${error.message}`
      );
    }

    return new Error(
      `OpenRouterProvider: ${operation} failed with an unknown error.`
    );
  }
}