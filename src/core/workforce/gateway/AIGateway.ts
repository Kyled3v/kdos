/**
 * The single point of communication between KDOS and any external AI
 * provider. No other component in KDOS may call an AI provider directly;
 * all requests must pass through the AIGateway. New providers are added
 * by implementing the AIProvider interface and registering an adapter,
 * without modifying existing gateway or employee code.
 */

/**
 * A single message exchanged with an AI provider.
 */
export interface AIMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

/**
 * A normalised request sent to an AI provider through the gateway.
 */
export interface AIRequest {
  readonly messages: readonly AIMessage[];
  readonly model?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * A normalised response returned from an AI provider through the gateway.
 */
export interface AIResponse {
  readonly content: string;
  readonly model: string;
  readonly provider: string;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
  readonly raw: unknown;
}

/**
 * The contract every AI provider adapter must implement. Provider-specific
 * logic (authentication, request shaping, response parsing) lives entirely
 * inside the adapter, never inside the gateway or an employee.
 */
export interface AIProvider {
  readonly name: string;
  generate(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<string>;
  healthCheck(): Promise<boolean>;
}

/**
 * Singleton gateway responsible for routing all AI communication through
 * registered provider adapters.
 */
export class AIGateway {
  private static instance: AIGateway | null = null;

  private readonly registeredProviders: Map<string, AIProvider>;
  private activeProvider: AIProvider | null;

  private constructor() {
    this.registeredProviders = new Map<string, AIProvider>();
    this.activeProvider = null;
  }

  /**
   * Returns the singleton instance of the gateway.
   */
  public static getInstance(): AIGateway {
    if (AIGateway.instance === null) {
      AIGateway.instance = new AIGateway();
    }

    return AIGateway.instance;
  }

  /**
   * Registers a new provider adapter. Throws if the provider is invalid
   * or already registered.
   */
  public registerProvider(provider: AIProvider): void {
    if (!provider) {
      throw new Error("AIGateway: provider is required.");
    }

    if (!provider.name) {
      throw new Error("AIGateway: provider.name is required.");
    }

    if (this.registeredProviders.has(provider.name)) {
      throw new Error(
        `AIGateway: provider "${provider.name}" is already registered.`
      );
    }

    this.registeredProviders.set(provider.name, provider);

    if (this.activeProvider === null) {
      this.activeProvider = provider;
    }
  }

  /**
   * Sets the active provider by name. Throws if the provider is not
   * registered.
   */
  public setActiveProvider(providerName: string): void {
    if (!providerName) {
      throw new Error("AIGateway: providerName is required.");
    }

    const provider = this.registeredProviders.get(providerName);

    if (!provider) {
      throw new Error(
        `AIGateway: provider "${providerName}" is not registered.`
      );
    }

    this.activeProvider = provider;
  }

  /**
   * Returns the currently active provider. Throws if no provider is
   * active.
   */
  public getActiveProvider(): AIProvider {
    if (this.activeProvider === null) {
      throw new Error("AIGateway: no active provider has been set.");
    }

    return this.activeProvider;
  }

  /**
   * Sends a request to the active provider and returns a normalised
   * response. Throws if no provider is active or the request is invalid.
   */
  public async generate(request: AIRequest): Promise<AIResponse> {
    this.validateRequest(request);

    const provider = this.getActiveProvider();

    return provider.generate(request);
  }

  /**
   * Streams a response from the active provider. Throws if no provider
   * is active or the request is invalid.
   */
  public stream(request: AIRequest): AsyncIterable<string> {
    this.validateRequest(request);

    const provider = this.getActiveProvider();

    return provider.stream(request);
  }

  /**
   * Runs a health check against the active provider. Throws if no
   * provider is active.
   */
  public async healthCheck(): Promise<boolean> {
    const provider = this.getActiveProvider();

    return provider.healthCheck();
  }

  /**
   * Returns the names of all registered providers.
   */
  public listProviders(): string[] {
    return Array.from(this.registeredProviders.keys());
  }

  /**
   * Removes a registered provider by name. Throws if the provider does
   * not exist. If the removed provider was active, the active provider
   * is cleared.
   */
  public removeProvider(providerName: string): void {
    if (!providerName) {
      throw new Error("AIGateway: providerName is required.");
    }

    if (!this.registeredProviders.has(providerName)) {
      throw new Error(
        `AIGateway: provider "${providerName}" is not registered.`
      );
    }

    const provider = this.registeredProviders.get(providerName);

    this.registeredProviders.delete(providerName);

    if (this.activeProvider === provider) {
      this.activeProvider = null;
    }
  }

  /**
   * Validates the shape of an incoming request. Throws on any
   * malformed input.
   */
  private validateRequest(request: AIRequest): void {
    if (!request) {
      throw new Error("AIGateway: request is required.");
    }

    if (!Array.isArray(request.messages) || request.messages.length === 0) {
      throw new Error("AIGateway: request.messages must be a non-empty array.");
    }

    for (const message of request.messages) {
      if (!message.role || !message.content) {
        throw new Error(
          "AIGateway: each message must have a role and content."
        );
      }
    }
  }
}

export const aiGateway = AIGateway.getInstance();