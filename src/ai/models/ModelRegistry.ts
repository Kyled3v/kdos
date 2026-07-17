/**
 * ModelRegistry
 *
 * Singleton in-memory registry responsible for storing and retrieving
 * ModelManifest, ModelAssignment, and ModelHealth records. Uses Map-based
 * storage only. No database, no networking, no AI calls.
 */

import { ModelManifest } from "./ModelManifest";
import { ModelAssignment } from "./ModelAssignment";
import { ModelHealth } from "./ModelHealth";

export enum ModelRegistrationState {
  REGISTERED = "REGISTERED",
  ENABLED = "ENABLED",
  DISABLED = "DISABLED",
}

export class ModelRegistry {
  private static instance: ModelRegistry | null = null;

  private readonly manifests: Map<string, ModelManifest>;
  private readonly states: Map<string, ModelRegistrationState>;
  private readonly assignments: Map<string, ModelAssignment>;
  private readonly health: Map<string, ModelHealth>;

  private constructor() {
    this.manifests = new Map<string, ModelManifest>();
    this.states = new Map<string, ModelRegistrationState>();
    this.assignments = new Map<string, ModelAssignment>();
    this.health = new Map<string, ModelHealth>();
  }

  /**
   * Returns the singleton instance of ModelRegistry.
   */
  public static getInstance(): ModelRegistry {
    if (ModelRegistry.instance === null) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  /**
   * Resets the singleton instance. Intended for test isolation only.
   */
  public static resetInstance(): void {
    ModelRegistry.instance = null;
  }

  // ---------------------------------------------------------------------
  // Manifests
  // ---------------------------------------------------------------------

  /**
   * Registers a model manifest in DISABLED state. Throws if already registered.
   */
  public register(manifest: ModelManifest): void {
    if (this.manifests.has(manifest.modelId)) {
      throw new Error(`Model with id "${manifest.modelId}" is already registered.`);
    }
    this.manifests.set(manifest.modelId, manifest);
    this.states.set(manifest.modelId, ModelRegistrationState.REGISTERED);
  }

  /**
   * Removes a model manifest and all associated assignments/health.
   * Throws if not registered.
   */
  public remove(modelId: string): void {
    if (!this.manifests.has(modelId)) {
      throw new Error(`Cannot remove unregistered model "${modelId}".`);
    }
    this.manifests.delete(modelId);
    this.states.delete(modelId);
    this.health.delete(modelId);

    for (const [employeeId, assignment] of this.assignments) {
      if (assignment.primaryModel === modelId || assignment.fallbackModel === modelId) {
        this.assignments.delete(employeeId);
      }
    }
  }

  /**
   * Finds a model manifest by id. Throws if not registered.
   */
  public find(modelId: string): ModelManifest {
    const manifest = this.manifests.get(modelId);
    if (!manifest) {
      throw new Error(`No model found with id "${modelId}".`);
    }
    return manifest;
  }

  /**
   * Returns true if a model with the given id is registered.
   */
  public has(modelId: string): boolean {
    return this.manifests.has(modelId);
  }

  /**
   * Lists every registered model manifest.
   */
  public list(): readonly ModelManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Enables a registered model. Throws if not registered.
   */
  public enable(modelId: string): void {
    if (!this.manifests.has(modelId)) {
      throw new Error(`Cannot enable unregistered model "${modelId}".`);
    }
    this.states.set(modelId, ModelRegistrationState.ENABLED);
  }

  /**
   * Disables a registered model. Throws if not registered.
   */
  public disable(modelId: string): void {
    if (!this.manifests.has(modelId)) {
      throw new Error(`Cannot disable unregistered model "${modelId}".`);
    }
    this.states.set(modelId, ModelRegistrationState.DISABLED);
  }

  /**
   * Returns true if the given model is currently ENABLED.
   */
  public isEnabled(modelId: string): boolean {
    return this.states.get(modelId) === ModelRegistrationState.ENABLED;
  }

  /**
   * Lists every currently enabled model manifest.
   */
  public listEnabled(): readonly ModelManifest[] {
    return this.list().filter((manifest) => this.isEnabled(manifest.modelId));
  }

  // ---------------------------------------------------------------------
  // Assignments
  // ---------------------------------------------------------------------

  /**
   * Assigns a model configuration to an employee, replacing any existing
   * assignment for that employee. Throws if the primary model is not a
   * registered, enabled model.
   */
  public assign(assignment: ModelAssignment): void {
    if (!this.has(assignment.primaryModel)) {
      throw new Error(`Cannot assign unregistered model "${assignment.primaryModel}".`);
    }
    if (!this.isEnabled(assignment.primaryModel)) {
      throw new Error(`Cannot assign disabled model "${assignment.primaryModel}".`);
    }
    this.assignments.set(assignment.employeeId, assignment);
  }

  /**
   * Finds the model assignment for an employee. Throws if none exists.
   */
  public findAssignment(employeeId: string): ModelAssignment {
    const assignment = this.assignments.get(employeeId);
    if (!assignment) {
      throw new Error(`No model assignment found for employee "${employeeId}".`);
    }
    return assignment;
  }

  /**
   * Lists every current model assignment.
   */
  public listAssignments(): readonly ModelAssignment[] {
    return Array.from(this.assignments.values());
  }

  // ---------------------------------------------------------------------
  // Health
  // ---------------------------------------------------------------------

  /**
   * Records the latest health snapshot for a model.
   */
  public recordHealth(health: ModelHealth): void {
    this.health.set(health.modelId, health);
  }

  /**
   * Finds the latest recorded health snapshot for a model, if any.
   */
  public findHealth(modelId: string): ModelHealth | null {
    return this.health.get(modelId) ?? null;
  }
}