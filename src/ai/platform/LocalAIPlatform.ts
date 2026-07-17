/**
 * LocalAIPlatform
 *
 * Singleton top-level facade composing every Local AI Platform component
 * (RuntimeManager, ModelRegistry, ModelDownloader, ModelLoader,
 * GPUDetector, ModelPermissions) into a single coherent surface for
 * onboarding a model end-to-end: register its manifest, verify hardware
 * fit, verify license permission, download its weights, and load it
 * into a running runtime. This file implements none of the underlying
 * mechanics itself — it orchestrates the already-composed subsystems.
 * No networking, no Ollama API calls, no AI calls.
 */

import { AIRuntime } from "./AIRuntime";
import { RuntimeManager } from "./RuntimeManager";
import { ModelRegistry } from "./ModelRegistry";
import { ModelManifest } from "./ModelManifest";
import { ModelDownloader } from "./ModelDownloader";
import { ModelLoader } from "./ModelLoader";
import { ModelHealth } from "./ModelHealth";
import { GPUDetector } from "./GPUDetector";
import { ModelPermissions } from "./ModelPermissions";
import { ModelAssignment } from "./ModelAssignment";

export interface OnboardModelInput {
  readonly manifest: ModelManifest;
  readonly runtimeId: string;
}

export interface OnboardModelResult {
  readonly manifest: ModelManifest;
  readonly localPath: string;
  readonly health: ModelHealth;
}

export class LocalAIPlatform {
  private static instance: LocalAIPlatform | null = null;

  private readonly runtimeManager: RuntimeManager;
  private readonly modelRegistry: ModelRegistry;
  private readonly modelDownloader: ModelDownloader;
  private readonly modelLoader: ModelLoader;
  private readonly gpuDetector: GPUDetector;
  private readonly modelPermissions: ModelPermissions;

  private constructor(
    runtimeManager: RuntimeManager,
    modelRegistry: ModelRegistry,
    modelDownloader: ModelDownloader,
    modelLoader: ModelLoader,
    gpuDetector: GPUDetector,
    modelPermissions: ModelPermissions
  ) {
    this.runtimeManager = runtimeManager;
    this.modelRegistry = modelRegistry;
    this.modelDownloader = modelDownloader;
    this.modelLoader = modelLoader;
    this.gpuDetector = gpuDetector;
    this.modelPermissions = modelPermissions;
  }

  /**
   * Returns the singleton instance of LocalAIPlatform, composed from its
   * constituent subsystems, supplied via dependency injection.
   */
  public static getInstance(dependencies: {
    runtimeManager: RuntimeManager;
    modelDownloader: ModelDownloader;
    modelLoader: ModelLoader;
    gpuDetector: GPUDetector;
    modelRegistry?: ModelRegistry;
    modelPermissions?: ModelPermissions;
  }): LocalAIPlatform {
    if (LocalAIPlatform.instance === null) {
      LocalAIPlatform.instance = new LocalAIPlatform(
        dependencies.runtimeManager,
        dependencies.modelRegistry ?? ModelRegistry.getInstance(),
        dependencies.modelDownloader,
        dependencies.modelLoader,
        dependencies.gpuDetector,
        dependencies.modelPermissions ?? ModelPermissions.getInstance()
      );
    }
    return LocalAIPlatform.instance;
  }

  /**
   * Resets the singleton instance. Intended for test isolation only.
   */
  public static resetInstance(): void {
    LocalAIPlatform.instance = null;
  }

  /**
   * Onboards a model end-to-end: registers its manifest, verifies GPU/CPU
   * fit, verifies license entitlement and enables the model, downloads
   * its weights, loads it into the target runtime, and returns an
   * initial health check. Throws at the first failing step.
   */
  public onboardModel(input: OnboardModelInput): OnboardModelResult {
    if (!this.modelRegistry.has(input.manifest.modelId)) {
      this.modelRegistry.register(input.manifest);
    }

    const detection = this.gpuDetector.detect();
    if (!input.manifest.fitsInVRAM(detection.totalVRAMBytes) && !input.manifest.supportsCPUFallback) {
      throw new Error(
        `Model "${input.manifest.modelId}" does not fit in available VRAM and has no CPU fallback support.`
      );
    }

    this.modelPermissions.enable(input.manifest.modelId);
    this.modelRegistry.enable(input.manifest.modelId);

    const localPath = this.modelDownloader.download(input.manifest);

    this.runtimeManager.find(input.runtimeId);
    this.modelLoader.load(input.manifest, input.runtimeId);

    const health = this.modelLoader.checkHealth(input.manifest);
    this.modelRegistry.recordHealth(health);

    return { manifest: input.manifest, localPath, health };
  }

  /**
   * Offboards a model: unloads it from its runtime and disables it in
   * both ModelPermissions and ModelRegistry.
   */
  public offboardModel(manifest: ModelManifest): void {
    if (this.modelLoader.isLoaded(manifest.modelId)) {
      this.modelLoader.unload(manifest);
    }

    this.modelPermissions.disable(manifest.modelId);
    this.modelRegistry.disable(manifest.modelId);
  }

  /**
   * Assigns a model configuration to an employee via the ModelRegistry.
   */
  public assignModelToEmployee(assignment: ModelAssignment): void {
    this.modelRegistry.assign(assignment);
  }

  /**
   * Returns the runtime the platform is currently tracking with the
   * given id. Throws if not tracked.
   */
  public getRuntime(runtimeId: string): AIRuntime {
    return this.runtimeManager.find(runtimeId);
  }

  /**
   * Returns the current GPU detection result.
   */
  public detectHardware() {
    return this.gpuDetector.detect();
  }
}