/**
 * ModelLoader
 *
 * Manages the in-memory (or in-runtime) load state of a downloaded
 * model: loading it into a specific AIRuntime, unloading it, and
 * observing its health. This file contains no AI calls — the actual
 * load/unload mechanism is supplied by the caller as a
 * ModelLoadTransport implementation and injected in.
 */

import { ModelManifest } from "./ModelManifest";
import { ModelHealth } from "./ModelHealth";

export enum ModelLoadStatus {
  UNLOADED = "UNLOADED",
  LOADING = "LOADING",
  LOADED = "LOADED",
  UNLOADING = "UNLOADING",
  FAILED = "FAILED",
}

export interface ModelLoadRecord {
  readonly modelId: string;
  readonly runtimeId: string;
  readonly status: ModelLoadStatus;
  readonly loadedAt: Date | null;
}

/**
 * ModelLoadTransport
 *
 * Dependency-injection boundary describing how ModelLoader loads and
 * unloads a model within a specific runtime, and how it probes health.
 * The concrete mechanism is owned and supplied by the caller, not by
 * this file.
 */
export interface ModelLoadTransport {
  load(manifest: ModelManifest, runtimeId: string): void;
  unload(manifest: ModelManifest, runtimeId: string): void;
  probeHealth(manifest: ModelManifest): { warnings: readonly string[]; errors: readonly string[]; averageLatencyMs: number };
}

export class ModelLoader {
  private readonly transport: ModelLoadTransport;
  private readonly records: Map<string, ModelLoadRecord>;

  /**
   * Constructs a ModelLoader bound to a specific ModelLoadTransport,
   * supplied via dependency injection.
   */
  public constructor(transport: ModelLoadTransport) {
    this.transport = transport;
    this.records = new Map<string, ModelLoadRecord>();
  }

  /**
   * Loads a model into the given runtime. Throws if already loaded.
   */
  public load(manifest: ModelManifest, runtimeId: string): ModelLoadRecord {
    const existing = this.records.get(manifest.modelId);
    if (existing && existing.status === ModelLoadStatus.LOADED) {
      throw new Error(`Model "${manifest.modelId}" is already loaded.`);
    }

    this.records.set(manifest.modelId, {
      modelId: manifest.modelId,
      runtimeId,
      status: ModelLoadStatus.LOADING,
      loadedAt: null,
    });

    try {
      this.transport.load(manifest, runtimeId);
    } catch (error) {
      this.records.set(manifest.modelId, {
        modelId: manifest.modelId,
        runtimeId,
        status: ModelLoadStatus.FAILED,
        loadedAt: null,
      });
      throw error;
    }

    const record: ModelLoadRecord = {
      modelId: manifest.modelId,
      runtimeId,
      status: ModelLoadStatus.LOADED,
      loadedAt: new Date(),
    };
    this.records.set(manifest.modelId, record);

    return record;
  }

  /**
   * Unloads a model from its runtime. Throws if not currently loaded.
   */
  public unload(manifest: ModelManifest): ModelLoadRecord {
    const existing = this.records.get(manifest.modelId);
    if (!existing || existing.status !== ModelLoadStatus.LOADED) {
      throw new Error(`Model "${manifest.modelId}" is not currently loaded.`);
    }

    this.records.set(manifest.modelId, {
      modelId: manifest.modelId,
      runtimeId: existing.runtimeId,
      status: ModelLoadStatus.UNLOADING,
      loadedAt: existing.loadedAt,
    });

    this.transport.unload(manifest, existing.runtimeId);

    const record: ModelLoadRecord = {
      modelId: manifest.modelId,
      runtimeId: existing.runtimeId,
      status: ModelLoadStatus.UNLOADED,
      loadedAt: null,
    };
    this.records.set(manifest.modelId, record);

    return record;
  }

  /**
   * Probes and returns a ModelHealth snapshot for a loaded model. Throws
   * if the model is not currently loaded.
   */
  public checkHealth(manifest: ModelManifest): ModelHealth {
    const existing = this.records.get(manifest.modelId);
    if (!existing || existing.status !== ModelLoadStatus.LOADED) {
      throw new Error(`Cannot check health for model "${manifest.modelId}" that is not loaded.`);
    }

    const probe = this.transport.probeHealth(manifest);

    return ModelHealth.evaluate({
      modelId: manifest.modelId,
      warnings: probe.warnings,
      errors: probe.errors,
      averageLatencyMs: probe.averageLatencyMs,
    });
  }

  /**
   * Returns true if the given model is currently LOADED.
   */
  public isLoaded(modelId: string): boolean {
    return this.records.get(modelId)?.status === ModelLoadStatus.LOADED;
  }

  /**
   * Returns the current load record for a model, if any.
   */
  public getRecord(modelId: string): ModelLoadRecord | null {
    return this.records.get(modelId) ?? null;
  }
}