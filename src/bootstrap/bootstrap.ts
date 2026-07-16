/**
 * bootstrap
 *
 * Entry point that assembles the ApplicationConfig and starts KDOS.
 * This file wires together the existing PlatformKernel, ServiceContainer,
 * and ModuleLoader through Application — it implements none of the
 * subsystems themselves. External subsystem factories (License Manager,
 * Model Manager, CRM, Workflow Engine, Lead Automation, Workforce Runtime)
 * are supplied here as thin adapters over each subsystem's own
 * getInstance() singleton accessor, matching the SingletonModuleFactory
 * contract expected by ModuleLoader.
 */

import { Application, ExternalModuleFactories } from "./core/platform/Application";
import { PlatformEnvironment } from "./core/platform/PlatformState";
import { SingletonModule, SingletonModuleFactory } from "./core/platform/ModuleLoader";

import { LicenseManager } from "./core/license/LicenseManager";
import { ModelManager } from "./core/models/ModelManager";
import { CRM } from "./core/crm/CRM";
import { WorkflowEngine } from "./core/workflow/WorkflowEngine";
import { LeadAutomation } from "./core/leads/LeadAutomation";
import { WorkforceRuntime } from "./core/workforce/WorkforceRuntime";

/**
 * Wraps an existing singleton class's static getInstance() method as a
 * SingletonModuleFactory, so ModuleLoader can resolve it without knowing
 * the concrete class.
 */
function asFactory<T extends SingletonModule>(singleton: { getInstance(): T }): SingletonModuleFactory<T> {
  return { getInstance: () => singleton.getInstance() };
}

const externalFactories: ExternalModuleFactories = {
  licenseManager: asFactory(LicenseManager),
  modelManager: asFactory(ModelManager),
  crm: asFactory(CRM),
  workflowEngine: asFactory(WorkflowEngine),
  leadAutomation: asFactory(LeadAutomation),
  workforceRuntime: asFactory(WorkforceRuntime),
};

function resolveEnvironment(): PlatformEnvironment {
  const raw = process.env.KDOS_ENVIRONMENT?.trim().toUpperCase();

  switch (raw) {
    case "PRODUCTION":
      return PlatformEnvironment.PRODUCTION;
    case "STAGING":
      return PlatformEnvironment.STAGING;
    case "DEVELOPMENT":
    default:
      return PlatformEnvironment.DEVELOPMENT;
  }
}

const app = Application.getInstance({
  kernel: {
    version: "2.0.0",
    edition: "KDOS Internal",
    environment: resolveEnvironment(),
  },
  externalFactories,
});

app.start();

export { app };
export default app;