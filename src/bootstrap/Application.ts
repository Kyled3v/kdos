/**
 * Application
 *
 * Singleton top-level orchestrator that ties ModuleLoader, ServiceContainer,
 * and PlatformKernel together into a single start/stop lifecycle for KDOS.
 * Application does not implement any subsystem — it composes the existing
 * PlatformKernel boot sequence with ModuleLoader's service wiring so that
 * every subsystem is loaded into the ServiceContainer before the kernel's
 * own module verification and start phases run.
 */

import { ServiceContainer, ServiceToken } from "./ServiceContainer";
import { ModuleLoader, SingletonModule, SingletonModuleFactory } from "./ModuleLoader";
import { PlatformRegistry } from "./PlatformRegistry";
import { PlatformEvents } from "./PlatformEvents";
import { PlatformKernel, PlatformKernelConfig } from "./PlatformKernel";
import { PlatformState } from "./PlatformState";
import { PlatformHealth } from "./PlatformHealth";

export interface ExternalModuleFactories {
  readonly licenseManager: SingletonModuleFactory<SingletonModule>;
  readonly modelManager: SingletonModuleFactory<SingletonModule>;
  readonly crm: SingletonModuleFactory<SingletonModule>;
  readonly workflowEngine: SingletonModuleFactory<SingletonModule>;
  readonly leadAutomation: SingletonModuleFactory<SingletonModule>;
  readonly workforceRuntime: SingletonModuleFactory<SingletonModule>;
}

export interface ApplicationConfig {
  readonly kernel: PlatformKernelConfig;
  readonly externalFactories: ExternalModuleFactories;
}

export class Application {
  private static instance: Application | null = null;

  private readonly container: ServiceContainer;
  private readonly registry: PlatformRegistry;
  private readonly events: PlatformEvents;
  private readonly loader: ModuleLoader;
  private readonly kernel: PlatformKernel;
  private readonly config: ApplicationConfig;

  private started: boolean;

  private constructor(
    container: ServiceContainer,
    registry: PlatformRegistry,
    events: PlatformEvents,
    loader: ModuleLoader,
    kernel: PlatformKernel,
    config: ApplicationConfig
  ) {
    this.container = container;
    this.registry = registry;
    this.events = events;
    this.loader = loader;
    this.kernel = kernel;
    this.config = config;
    this.started = false;
  }

  /**
   * Returns the singleton instance of Application. On first call, a
   * config must be supplied; subsequent calls ignore the config
   * parameter and return the existing instance. Accepts optional
   * dependency overrides for dependency injection in tests.
   */
  public static getInstance(
    config: ApplicationConfig,
    container?: ServiceContainer,
    registry?: PlatformRegistry,
    events?: PlatformEvents,
    loader?: ModuleLoader,
    kernel?: PlatformKernel
  ): Application {
    if (Application.instance === null) {
      const resolvedContainer = container ?? ServiceContainer.getInstance();
      const resolvedRegistry = registry ?? PlatformRegistry.getInstance();
      const resolvedEvents = events ?? PlatformEvents.getInstance();
      const resolvedLoader = loader ?? new ModuleLoader(resolvedContainer, resolvedRegistry, resolvedEvents);
      const resolvedKernel = kernel ?? PlatformKernel.getInstance(config.kernel, resolvedRegistry, resolvedEvents);

      Application.instance = new Application(
        resolvedContainer,
        resolvedRegistry,
        resolvedEvents,
        resolvedLoader,
        resolvedKernel,
        config
      );
    }
    return Application.instance;
  }

  /**
   * Resets the singleton instance. Intended for test isolation only.
   */
  public static resetInstance(): void {
    Application.instance = null;
  }

  /**
   * Starts KDOS end-to-end: loads every subsystem service into the
   * ServiceContainer via ModuleLoader, then boots the PlatformKernel,
   * which verifies and starts each corresponding module descriptor.
   * Throws if the application has already been started.
   */
  public start(): PlatformState {
    if (this.started) {
      throw new Error("Application has already been started.");
    }

    this.events.emit("APPLICATION_STARTING", {});

    const definitions = this.loader.definitions(this.config.externalFactories);
    this.loader.loadAll(definitions);

    const state = this.kernel.boot(definitions.map((definition) => definition.name));

    this.started = true;
    this.events.emit("APPLICATION_STARTED", { startedAt: state.startedAt });

    return state;
  }

  /**
   * Stops KDOS: shuts down the PlatformKernel. Throws if the application
   * has not been started.
   */
  public stop(): PlatformState {
    if (!this.started) {
      throw new Error("Application has not been started and cannot be stopped.");
    }

    this.events.emit("APPLICATION_STOPPING", {});
    const state = this.kernel.shutdown();

    this.started = false;
    this.events.emit("APPLICATION_STOPPED", {});

    return state;
  }

  /**
   * Restarts KDOS: stops if currently started, then starts again.
   */
  public restart(): PlatformState {
    if (this.started) {
      this.stop();
    }

    this.container.clear();
    this.events.emit("APPLICATION_RESTARTING", {});

    return this.start();
  }

  /**
   * Returns true if the application is currently started.
   */
  public isStarted(): boolean {
    return this.started;
  }

  /**
   * Returns the current PlatformState snapshot from the kernel.
   */
  public getState(): PlatformState {
    return this.kernel.getState();
  }

  /**
   * Returns the current PlatformHealth snapshot from the kernel.
   */
  public getHealth(): PlatformHealth {
    return this.kernel.getHealth();
  }

  /**
   * Resolves a loaded subsystem service from the ServiceContainer by
   * token, cast to the requested type. Throws if the service has not
   * been loaded.
   */
  public resolve<T>(token: ServiceToken): T {
    return this.container.resolve<T>(token);
  }
}