/**
 * ModelAssignment
 *
 * Binds a KDOS employee to a primary and fallback local model, along
 * with the inference parameters (maximum context, temperature) they
 * should run with. Immutable value object. No AI calls happen here —
 * this is purely a configuration record consumed by whatever invokes
 * the Model Manager at execution time.
 */

export interface ModelAssignmentProps {
  readonly employeeId: string;
  readonly primaryModel: string;
  readonly fallbackModel: string | null;
  readonly maximumContext: number;
  readonly temperature: number;
}

export class ModelAssignment {
  public readonly employeeId: string;
  public readonly primaryModel: string;
  public readonly fallbackModel: string | null;
  public readonly maximumContext: number;
  public readonly temperature: number;

  private constructor(props: ModelAssignmentProps) {
    this.employeeId = props.employeeId;
    this.primaryModel = props.primaryModel;
    this.fallbackModel = props.fallbackModel;
    this.maximumContext = props.maximumContext;
    this.temperature = props.temperature;
  }

  /**
   * Creates a new ModelAssignment. Throws if required fields are invalid.
   */
  public static create(props: ModelAssignmentProps): ModelAssignment {
    if (!props.employeeId || props.employeeId.trim().length === 0) {
      throw new Error("ModelAssignment requires a non-empty employeeId.");
    }
    if (!props.primaryModel || props.primaryModel.trim().length === 0) {
      throw new Error("ModelAssignment requires a non-empty primaryModel.");
    }
    if (props.fallbackModel === props.primaryModel) {
      throw new Error("ModelAssignment fallbackModel cannot equal primaryModel.");
    }
    if (props.maximumContext <= 0) {
      throw new Error("ModelAssignment maximumContext must be greater than zero.");
    }
    if (props.temperature < 0 || props.temperature > 2) {
      throw new Error("ModelAssignment temperature must be between 0 and 2.");
    }

    return new ModelAssignment(props);
  }

  /**
   * Reconstructs a ModelAssignment from a stored snapshot.
   */
  public static fromSnapshot(snapshot: ModelAssignmentProps): ModelAssignment {
    return new ModelAssignment(snapshot);
  }

  /**
   * Returns a new ModelAssignment with a different primary model.
   */
  public withPrimaryModel(primaryModel: string): ModelAssignment {
    return ModelAssignment.create({
      employeeId: this.employeeId,
      primaryModel,
      fallbackModel: this.fallbackModel,
      maximumContext: this.maximumContext,
      temperature: this.temperature,
    });
  }

  /**
   * Returns a new ModelAssignment with a different fallback model.
   */
  public withFallbackModel(fallbackModel: string | null): ModelAssignment {
    return ModelAssignment.create({
      employeeId: this.employeeId,
      primaryModel: this.primaryModel,
      fallbackModel,
      maximumContext: this.maximumContext,
      temperature: this.temperature,
    });
  }

  /**
   * Returns a plain serialisable snapshot of this assignment.
   */
  public toSnapshot(): ModelAssignmentProps {
    return {
      employeeId: this.employeeId,
      primaryModel: this.primaryModel,
      fallbackModel: this.fallbackModel,
      maximumContext: this.maximumContext,
      temperature: this.temperature,
    };
  }
}