/**
 * ModelHealth
 *
 * Immutable snapshot describing the operational health of a loaded local
 * model: responsiveness, error accumulation, and resource pressure. No
 * networking or AI calls — health data is supplied by whatever
 * component observes the model (e.g. ModelLoader), not computed here.
 */

export interface ModelHealthProps {
  readonly modelId: string;
  readonly healthy: boolean;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly averageLatencyMs: number;
  readonly lastCheckedAt: Date;
}

export class ModelHealth {
  public readonly modelId: string;
  public readonly healthy: boolean;
  public readonly warnings: readonly string[];
  public readonly errors: readonly string[];
  public readonly averageLatencyMs: number;
  public readonly lastCheckedAt: Date;

  private constructor(props: ModelHealthProps) {
    this.modelId = props.modelId;
    this.healthy = props.healthy;
    this.warnings = props.warnings;
    this.errors = props.errors;
    this.averageLatencyMs = props.averageLatencyMs;
    this.lastCheckedAt = props.lastCheckedAt;
  }

  /**
   * Evaluates a ModelHealth snapshot from observed warnings, errors, and
   * latency. Healthy if and only if there are no errors.
   */
  public static evaluate(props: {
    modelId: string;
    warnings: readonly string[];
    errors: readonly string[];
    averageLatencyMs: number;
  }): ModelHealth {
    if (!props.modelId || props.modelId.trim().length === 0) {
      throw new Error("ModelHealth requires a non-empty modelId.");
    }
    if (props.averageLatencyMs < 0) {
      throw new Error("ModelHealth averageLatencyMs cannot be negative.");
    }

    return new ModelHealth({
      modelId: props.modelId,
      healthy: props.errors.length === 0,
      warnings: props.warnings,
      errors: props.errors,
      averageLatencyMs: props.averageLatencyMs,
      lastCheckedAt: new Date(),
    });
  }

  /**
   * Reconstructs a ModelHealth snapshot from a stored snapshot.
   */
  public static fromSnapshot(snapshot: ModelHealthProps): ModelHealth {
    return new ModelHealth(snapshot);
  }

  /**
   * Returns true if there is at least one warning or error recorded.
   */
  public hasIssues(): boolean {
    return this.warnings.length > 0 || this.errors.length > 0;
  }

  /**
   * Returns a plain serialisable snapshot of this health record.
   */
  public toSnapshot(): ModelHealthProps {
    return {
      modelId: this.modelId,
      healthy: this.healthy,
      warnings: this.warnings,
      errors: this.errors,
      averageLatencyMs: this.averageLatencyMs,
      lastCheckedAt: this.lastCheckedAt,
    };
  }
}