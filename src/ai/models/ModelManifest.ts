/**
 * ModelManifest
 *
 * Declares the identity and hardware requirements of a local AI model
 * available to KDOS through a given AIRuntime, independent of whether it
 * is currently downloaded or loaded. Immutable value object. No
 * networking, no AI calls — this is a metadata description only.
 */

import { AIRuntimeKind } from "./AIRuntime";

export interface ModelManifestProps {
  readonly modelId: string;
  readonly displayName: string;
  readonly runtimeKind: AIRuntimeKind;
  readonly parameterCount: string;
  readonly quantization: string;
  readonly contextWindow: number;
  readonly diskSizeBytes: number;
  readonly minimumVRAMBytes: number;
  readonly supportsCPUFallback: boolean;
}

export class ModelManifest {
  public readonly modelId: string;
  public readonly displayName: string;
  public readonly runtimeKind: AIRuntimeKind;
  public readonly parameterCount: string;
  public readonly quantization: string;
  public readonly contextWindow: number;
  public readonly diskSizeBytes: number;
  public readonly minimumVRAMBytes: number;
  public readonly supportsCPUFallback: boolean;

  private constructor(props: ModelManifestProps) {
    this.modelId = props.modelId;
    this.displayName = props.displayName;
    this.runtimeKind = props.runtimeKind;
    this.parameterCount = props.parameterCount;
    this.quantization = props.quantization;
    this.contextWindow = props.contextWindow;
    this.diskSizeBytes = props.diskSizeBytes;
    this.minimumVRAMBytes = props.minimumVRAMBytes;
    this.supportsCPUFallback = props.supportsCPUFallback;
  }

  /**
   * Creates a new ModelManifest. Throws if required fields are invalid.
   */
  public static create(props: ModelManifestProps): ModelManifest {
    if (!props.modelId || props.modelId.trim().length === 0) {
      throw new Error("ModelManifest requires a non-empty modelId.");
    }
    if (!props.displayName || props.displayName.trim().length === 0) {
      throw new Error("ModelManifest requires a non-empty displayName.");
    }
    if (props.contextWindow <= 0) {
      throw new Error("ModelManifest contextWindow must be greater than zero.");
    }
    if (props.diskSizeBytes <= 0) {
      throw new Error("ModelManifest diskSizeBytes must be greater than zero.");
    }
    if (props.minimumVRAMBytes < 0) {
      throw new Error("ModelManifest minimumVRAMBytes cannot be negative.");
    }

    return new ModelManifest(props);
  }

  /**
   * Reconstructs a ModelManifest from a stored snapshot.
   */
  public static fromSnapshot(snapshot: ModelManifestProps): ModelManifest {
    return new ModelManifest(snapshot);
  }

  /**
   * Returns true if the given available VRAM is sufficient to load this
   * model on GPU.
   */
  public fitsInVRAM(availableVRAMBytes: number): boolean {
    return availableVRAMBytes >= this.minimumVRAMBytes;
  }

  /**
   * Returns a plain serialisable snapshot of this manifest.
   */
  public toSnapshot(): ModelManifestProps {
    return {
      modelId: this.modelId,
      displayName: this.displayName,
      runtimeKind: this.runtimeKind,
      parameterCount: this.parameterCount,
      quantization: this.quantization,
      contextWindow: this.contextWindow,
      diskSizeBytes: this.diskSizeBytes,
      minimumVRAMBytes: this.minimumVRAMBytes,
      supportsCPUFallback: this.supportsCPUFallback,
    };
  }
}