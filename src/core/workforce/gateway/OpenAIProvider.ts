import OpenAI from "openai";
import type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIMessage,
} from "./AIGateway";

/**
 * Configuration options for constructing an OpenAIProvider instance.
 */
export interface OpenAIProviderConfig {
  readonly defaultModel: string;
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
}

/**
 * AIProvider adapter for OpenAI. Encapsulates all OpenAI-specific
 * request shaping, error handling, and response parsing so that no
 * other part of KDOS ever depends on the OpenAI SDK directly.
 */
export class OpenAIProvider implements AIProvider {
  public readonly name = "openai";

  private readonly client: OpenAI;
  private readonly defaultModel: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  public constructor(config: OpenAIProviderConfig) {
    if (!config) {
      throw new Error("OpenAIProvider: config is required.");
    }

    if (!config.defaultModel) {
      throw new Error("OpenAIProvider: config.defaultModel is required.");
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OpenAIProvider: OPENAI_API_KEY environment variable is not set."
      );
    }

    this.client = new OpenAI({ apiKey });
    this.defaultModel = config.defaultModel;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelayMs = config.retryDelayMs ?? 500;
  }

  /**
   * Sends a chat completion request to OpenAI and returns a normalised
   * response. Retries on transient failures.
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
          "OpenAIProvider: received an empty completion from OpenAI."
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
   * Streams a chat completion from OpenAI, yielding text chunks as
   * they arrive.
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
   * Verifies connectivity and authentication with OpenAI by listing
   * available models. Returns false rather than throwing on failure.
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
      throw new Error("OpenAIProvider: request is required.");
    }

    if (!Array.isArray(request.messages) || request.messages.length === 0) {
      throw new Error(
        "OpenAIProvider: request.messages must be a non-empty array."
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
   * Determines whether an error represents a transient failure that is
   * safe to retry.
   */
  private isRetryable(error: unknown): boolean {
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
    if (error instanceof OpenAI.APIError) {
      return new Error(
        `OpenAIProvider: ${operation} failed with status ${error.status ?? "unknown"} - ${error.message}`
      );
    }

    if (error instanceof Error) {
      return new Error(
        `OpenAIProvider: ${operation} failed - ${error.message}`
      );
    }

    return new Error(
      `OpenAIProvider: ${operation} failed with an unknown error.`
    );
  }
}