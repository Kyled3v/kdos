/**
 * RuntimeManager
 *
 * Singleton service owning the lifecycle of every registered AIRuntime:
 * install, uninstall, start, stop, and restart. Delegates the mechanical
 * install/uninstall work to RuntimeInstaller and start/stop to an
 * injected RuntimeProcessControl transport (the actual process
 * management is owned by the caller, not this file). Map-based storage
 * only. No networking, no AI calls.
 */

import { AIRuntime, AIRuntimeKind, AIRuntimeStatus } from "./AIRuntime";
import { RuntimeInstaller } from "./RuntimeInstaller";

/**
 * RuntimeProcessControl
 *
 * Dependency-injection boundary describing how RuntimeManager starts and
 * stops an installed runtime's process. The concrete mechanism is owned
 * and supplied by the caller, not by this file.
 */
export interface RuntimeProcessControl {
  start(runtime: AIRuntime): void;
  stop(runtime: AIRuntime): void;
}

export class RuntimeManager {
  private static instance: RuntimeManager | null = null;

  private readonly runtimes: Map<string, AIRuntime>;
  private readonly installer: RuntimeInstaller;
  private readonly processControl: RuntimeProcessControl;

  private constructor(installer: RuntimeInstaller, processControl: RuntimeProcessControl) {
    this.runtimes = new Map<string, AIRuntime>();
    this.installer = installer;
    this.processControl = processControl;
  }

  /**
   * Returns the singleton instance of RuntimeManager.
   * Accepts optional dependency overrides for dependency injection in tests.
   */
  public static getInstance(installer: RuntimeInstaller, processControl: RuntimeProcessControl): RuntimeManager {
    if (RuntimeManager.instance === null) {
      RuntimeManager.instance = new RuntimeManager(installer, processControl);
    }
    return RuntimeManager.instance;
  }

  /**
   * Resets the singleton instance. Intended for test isolation only.
   */
  public static resetInstance(): void {
    RuntimeManager.instance = null;
  }

  /**
   * Installs a runtime of the given kind and tracks it. Throws if a
   * runtime with the same id is already tracked.
   */
  public installRuntime(runtimeId: string, kind: AIRuntimeKind, name: string): AIRuntime {
    if (this.runtimes.has(runtimeId)) {
      throw new Error(`Runtime with id "${runtimeId}" is already tracked.`);
    }

    const runtime = this.installer.install(runtimeId, kind, name);
    this.runtimes.set(runtime.id, runtime);
    return runtime;
  }

  /**
   * Uninstalls a tracked runtime and removes it from tracking. Throws if
   * the runtime is currently RUNNING (must be stopped first) or not
   * tracked.
   */
  public uninstallRuntime(runtimeId: string): AIRuntime {
    const runtime = this.find(runtimeId);

    if (runtime.status === AIRuntimeStatus.RUNNING) {
      throw new Error(`Cannot uninstall runtime "${runtimeId}" while it is RUNNING. Stop it first.`);
    }

    const uninstalled = this.installer.uninstall(runtime);
    this.runtimes.delete(runtimeId);
    return uninstalled;
  }

  /**
   * Starts a tracked, installed runtime's process.
   */
  public startRuntime(runtimeId: string): AIRuntime {
    const runtime = this.find(runtimeId);

    let starting = runtime.withStatus(AIRuntimeStatus.STARTING);
    this.runtimes.set(runtimeId, starting);

    try {
      this.processControl.start(starting);
    } catch (error) {
      const failed = starting.withStatus(AIRuntimeStatus.FAILED);
      this.runtimes.set(runtimeId, failed);
      throw error;
    }

    const running = starting.withStatus(AIRuntimeStatus.RUNNING);
    this.runtimes.set(runtimeId, running);
    return running;
  }

  /**
   * Stops a running runtime's process.
   */
  public stopRuntime(runtimeId: string): AIRuntime {
    const runtime = this.find(runtimeId);

    let stopping = runtime.withStatus(AIRuntimeStatus.STOPPING);
    this.runtimes.set(runtimeId, stopping);

    this.processControl.stop(stopping);

    const stopped = stopping.withStatus(AIRuntimeStatus.STOPPED);
    this.runtimes.set(runtimeId, stopped);
    return stopped;
  }

  /**
   * Restarts a runtime: stops it if currently running, then starts it again.
   */
  public restartRuntime(runtimeId: string): AIRuntime {
    const runtime = this.find(runtimeId);

    if (runtime.status === AIRuntimeStatus.RUNNING) {
      this.stopRuntime(runtimeId);
    }

    return this.startRuntime(runtimeId);
  }

  /**
   * Finds a tracked runtime by id. Throws if not tracked.
   */
  public find(runtimeId: string): AIRuntime {
    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) {
      throw new Error(`No runtime tracked with id "${runtimeId}".`);
    }
    return runtime;
  }

  /**
   * Lists every tracked runtime.
   */
  public list(): readonly AIRuntime[] {
    return Array.from(this.runtimes.values());
  }

  /**
   * Lists every tracked runtime currently RUNNING.
   */
  public listRunning(): readonly AIRuntime[] {
    return this.list().filter((runtime) => runtime.status === AIRuntimeStatus.RUNNING);
  }
}