/**
 * ModuleLoader
 *
 * Responsible for constructing (or resolving, for already-implemented
 * singletons) each KDOS subsystem service, registering it into the
 * ServiceContainer, and recording its descriptor in the PlatformRegistry
 * so PlatformKernel's boot sequence can track it. ModuleLoader does not
 * implement any subsystem itself — it only knows how to obtain each
 * singleton's existing getInstance() and wire it into the container.
 * Not a singleton; Application owns a single instance per process.
 */

import { ServiceContainer, ServiceToken } from "./ServiceContainer";
import { PlatformModule, PlatformModuleStatus, PlatformRegistry } from "./PlatformRegistry";
import { PlatformEvents } from "./PlatformEvents";

import { ProposalGenerator } from "../proposals/ProposalGenerator";
import { QuotationGenerator } from "../quotations/QuotationGenerator";
import { ProjectManager } from "../projects/ProjectManager";
import { TaskManager } from "../tasks/TaskManager";
import { ExecutionEngine } from "../execution/ExecutionEngine";

/**
 * Minimal contracts for subsystems whose concrete implementations are
 * owned outside this integration layer (License Manager, Model Manager,
 * CRM, Workflow Engine, Lead Automation, Workforce Runtime). ModuleLoader
 * depends only on these shapes, resolved via each subsystem's own
 * getInstance() singleton accessor, consistent with every other
 * subsystem in KDOS.
 */
export interface SingletonModule {
  // Marker interface: any subsystem singleton satisfies this trivially.
}

export interface SingletonModuleFactory<T extends SingletonModule> {
  getInstance(): T;
}

export interface ModuleDefinition<T extends SingletonModule = SingletonModule> {
  readonly token: ServiceToken;
  readonly name: string;
  readonly factory: SingletonModuleFactory<T>;
}

export interface ModuleLoadResult {
  readonly token: ServiceToken;
  readonly moduleId: string;
  readonly name: string;
}

export class ModuleLoader {
  private readonly container: ServiceContainer;
  private readonly registry: PlatformRegistry;
  private readonly events: PlatformEvents;

  /**
   * Constructs a ModuleLoader bound to a specific ServiceContainer,
   * PlatformRegistry, and PlatformEvents instance, supplied via
   * dependency injection.
   */
  public constructor(container: ServiceContainer, registry: PlatformRegistry, events: PlatformEvents) {
    this.container = container;
    this.registry = registry;
    this.events = events;
  }

  /**
   * Returns the definitions for every subsystem service known to KDOS.
   * Subsystems implemented within this codebase (Proposal, Quotation,
   * Project, Task, Execution) resolve directly to their concrete
   * singletons. Subsystems owned elsewhere (License Manager, Model
   * Manager, CRM, Workflow Engine, Lead Automation, Workforce Runtime)
   * are declared here for registration ordering and health tracking;
   * each is expected to expose a getInstance() singleton accessor
   * identical in shape to every other KDOS subsystem.
   */
  public definitions(externalFactories: {
    readonly licenseManager: SingletonModuleFactory<SingletonModule>;
    readonly modelManager: SingletonModuleFactory<SingletonModule>;
    readonly crm: SingletonModuleFactory<SingletonModule>;
    readonly workflowEngine: SingletonModuleFactory<SingletonModule>;
    readonly leadAutomation: SingletonModuleFactory<SingletonModule>;
    readonly workforceRuntime: SingletonModuleFactory<SingletonModule>;
  }): readonly ModuleDefinition[] {
    return [
      {
        token: ServiceToken.LICENSE_MANAGER,
        name: "License Manager",
        factory: externalFactories.licenseManager,
      },
      {
        token: ServiceToken.MODEL_MANAGER,
        name: "Model Manager",
        factory: externalFactories.modelManager,
      },
      {
        token: ServiceToken.CRM,
        name: "CRM",
        factory: externalFactories.crm,
      },
      {
        token: ServiceToken.WORKFLOW_ENGINE,
        name: "Workflow Engine",
        factory: externalFactories.workflowEngine,
      },
      {
        token: ServiceToken.EXECUTION_ENGINE,
        name: "Execution Engine",
        factory: { getInstance: () => ExecutionEngine.getInstance() },
      },
      {
        token: ServiceToken.TASK_MANAGER,
        name: "Task Engine",
        factory: { getInstance: () => TaskManager.getInstance() },
      },
      {
        token: ServiceToken.PROPOSAL_GENERATOR,
        name: "Proposal Engine",
        factory: { getInstance: () => ProposalGenerator.getInstance() },
      },
      {
        token: ServiceToken.QUOTATION_GENERATOR,
        name: "Quotation Engine",
        factory: { getInstance: () => QuotationGenerator.getInstance() },
      },
      {
        token: ServiceToken.PROJECT_MANAGER,
        name: "Project Engine",
        factory: { getInstance: () => ProjectManager.getInstance() },
      },
      {
        token: ServiceToken.LEAD_AUTOMATION,
        name: "Lead Automation",
        factory: externalFactories.leadAutomation,
      },
      {
        token: ServiceToken.WORKFORCE_RUNTIME,
        name: "Workforce Runtime",
        factory: externalFactories.workforceRuntime,
      },
    ];
  }

  /**
   * Loads every module in the given definition list: resolves its
   * singleton via getInstance(), registers it into the ServiceContainer,
   * and records/advances its PlatformModule descriptor in the
   * PlatformRegistry to LOADED. Returns a result per module, in the
   * order supplied. Throws if any module has already been loaded into
   * the container under its token.
   */
  public loadAll(definitions: readonly ModuleDefinition[]): readonly ModuleLoadResult[] {
    if (definitions.length === 0) {
      throw new Error("ModuleLoader.loadAll requires at least one module definition.");
    }

    const results: ModuleLoadResult[] = [];

    for (const definition of definitions) {
      results.push(this.loadOne(definition));
    }

    return results;
  }

  /**
   * Loads a single module definition: resolves its singleton, registers
   * it into the ServiceContainer, and records/advances its PlatformModule
   * descriptor to LOADED. Throws if the token is already registered in
   * the ServiceContainer.
   */
  public loadOne(definition: ModuleDefinition): ModuleLoadResult {
    if (this.container.has(definition.token)) {
      throw new Error(`Service for token "${definition.token}" has already been loaded.`);
    }

    const instance = definition.factory.getInstance();
    this.container.register(definition.token, instance);

    const moduleId = ModuleLoader.moduleIdFromName(definition.name);

    const descriptor = this.registry.has(moduleId)
      ? this.registry.find(moduleId)
      : PlatformModule.create({ id: moduleId, name: definition.name });

    if (!this.registry.has(moduleId)) {
      this.registry.register(descriptor);
    }

    const loaded = descriptor.withStatus(PlatformModuleStatus.LOADED);
    this.registry.update(loaded);

    this.events.emit("MODULE_LOADER_LOADED", { token: definition.token, moduleId, name: definition.name });

    return {
      token: definition.token,
      moduleId,
      name: definition.name,
    };
  }

  /**
   * Derives a stable module id from a human-readable module name,
   * matching the convention used by PlatformBoot.
   */
  private static moduleIdFromName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, "-");
  }
}