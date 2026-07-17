/**
 * AIRuntime
 *
 * Represents a single local AI runtime engine known to KDOS (Ollama,
 * LM Studio, llama.cpp, vLLM, or any future provider). Immutable value
 * object; mutation methods return new instances rather than modifying
 * state in place. This file contains no networking and no AI calls — it
 * only models runtime identity and lifecycle status.
 */

export enum AIRuntimeKind {
  OLLAMA = "OLLAMA",
  LM_STUDIO = "LM_STUDIO",
  LLAMA_CPP = "LLAMA_CPP",
  VLLM = "VLLM",
}

export enum AIRuntimeStatus {
  NOT_INSTALLED = "NOT_INSTALLED",
  INSTALLING = "INSTALLING",
  INSTALLED = "INSTALLED",
  STARTING = "STARTING",
  RUNNING = "RUNNING",
  STOPPING = "STOPPING",
  STOPPED = "STOPPED",
  FAILED = "FAILED",
  UNINSTALLING = "UNINSTALLED",
}

export interface AIRuntimeProps {
  readonly id: string;
  readonly kind: AIRuntimeKind;
  readonly name: string;
  readonly version: string | null;
  readonly executablePath: string | null;
  readonly status: AIRuntimeStatus;
  readonly installedAt: Date | null;
}

const VALID_TRANSITIONS: Readonly<Record<AIRuntimeStatus, readonly AIRuntimeStatus[]>> = {
  [AIRuntimeStatus.NOT_INSTALLED]: [AIRuntimeStatus.INSTALLING],
  [AIRuntimeStatus.INSTALLING]: [AIRuntimeStatus.INSTALLED, AIRuntimeStatus.FAILED],
  [AIRuntimeStatus.INSTALLED]: [AIRuntimeStatus.STARTING, AIRuntimeStatus.UNINSTALLING],
  [AIRuntimeStatus.STARTING]: [AIRuntimeStatus.RUNNING, AIRuntimeStatus.FAILED],
  [AIRuntimeStatus.RUNNING]: [AIRuntimeStatus.STOPPING, AIRuntimeStatus.FAILED],
  [AIRuntimeStatus.STOPPING]: [AIRuntimeStatus.STOPPED, AIRuntimeStatus.FAILED],
  [AIRuntimeStatus.STOPPED]: [AIRuntimeStatus.STARTING, AIRuntimeStatus.UNINSTALLING],
  [AIRuntimeStatus.FAILED]: [AIRuntimeStatus.STARTING, AIRuntimeStatus.UNINSTALLING],
  [AIRuntimeStatus.UNINSTALLING]: [AIRuntimeStatus.NOT_INSTALLED],
};

export class AIRuntime {
  public readonly id: string;
  public readonly kind: AIRuntimeKind;
  public readonly name: string;
  public readonly version: string | null;
  public readonly executablePath: string | null;
  public readonly status: AIRuntimeStatus;
  public readonly installedAt: Date | null;

  private constructor(props: AIRuntimeProps) {
    this.id = props.id;
    this.kind = props.kind;
    this.name = props.name;
    this.version = props.version;
    this.executablePath = props.executablePath;
    this.status = props.status;
    this.installedAt = props.installedAt;
  }

  /**
   * Creates a new AIRuntime descriptor in NOT_INSTALLED status.
   */
  public static create(props: { id: string; kind: AIRuntimeKind; name: string }): AIRuntime {
    if (!props.id || props.id.trim().length === 0) {
      throw new Error("AIRuntime requires a non-empty id.");
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new Error("AIRuntime requires a non-empty name.");
    }

    return new AIRuntime({
      id: props.id,
      kind: props.kind,
      name: props.name,
      version: null,
      executablePath: null,
      status: AIRuntimeStatus.NOT_INSTALLED,
      installedAt: null,
    });
  }

  /**
   * Reconstructs an AIRuntime from a stored snapshot.
   */
  public static fromSnapshot(snapshot: AIRuntimeProps): AIRuntime {
    return new AIRuntime(snapshot);
  }

  /**
   * Returns a new AIRuntime transitioned to the given status.
   * Throws if the transition is not valid from the current status.
   */
  public withStatus(status: AIRuntimeStatus): AIRuntime {
    const allowed = VALID_TRANSITIONS[this.status];
    if (!allowed.includes(status)) {
      throw new Error(`Invalid runtime status transition from "${this.status}" to "${status}" for runtime "${this.id}".`);
    }

    return new AIRuntime({
      id: this.id,
      kind: this.kind,
      name: this.name,
      version: this.version,
      executablePath: this.executablePath,
      status,
      installedAt: status === AIRuntimeStatus.INSTALLED ? new Date() : this.installedAt,
    });
  }

  /**
   * Returns a new AIRuntime with installation metadata recorded (version
   * and executable path), typically applied once INSTALLED is reached.
   */
  public withInstallationDetails(version: string, executablePath: string): AIRuntime {
    if (!version || version.trim().length === 0) {
      throw new Error("AIRuntime requires a non-empty version.");
    }
    if (!executablePath || executablePath.trim().length === 0) {
      throw new Error("AIRuntime requires a non-empty executablePath.");
    }

    return new AIRuntime({
      id: this.id,
      kind: this.kind,
      name: this.name,
      version,
      executablePath,
      status: this.status,
      installedAt: this.installedAt,
    });
  }

  /**
   * Returns true if this runtime is currently RUNNING.
   */
  public isActive(): boolean {
    return this.status === AIRuntimeStatus.RUNNING;
  }

  /**
   * Returns a plain serialisable snapshot of this runtime.
   */
  public toSnapshot(): AIRuntimeProps {
    return {
      id: this.id,
      kind: this.kind,
      name: this.name,
      version: this.version,
      executablePath: this.executablePath,
      status: this.status,
      installedAt: this.installedAt,
    };
  }
}