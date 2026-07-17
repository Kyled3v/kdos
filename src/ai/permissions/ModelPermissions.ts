/**
 * ModelPermissions
 *
 * Singleton service governing whether a given model may be enabled for
 * use, gated by an injected LicenseGate — the concrete license logic
 * lives in the License Manager subsystem, not here. Map-based storage
 * only. No networking, no AI calls.
 */

export enum ModelPermissionState {
  DISABLED = "DISABLED",
  ENABLED = "ENABLED",
}

/**
 * LicenseGate
 *
 * Dependency-injection boundary describing what ModelPermissions needs
 * from the License Manager to decide whether a model may be enabled.
 */
export interface LicenseGate {
  isModelLicensed(modelId: string): boolean;
}

export interface ModelPermissionRecord {
  readonly modelId: string;
  readonly state: ModelPermissionState;
  readonly updatedAt: Date;
}

export class ModelPermissions {
  private static instance: ModelPermissions | null = null;

  private readonly records: Map<string, ModelPermissionRecord>;
  private readonly licenseGate: LicenseGate;

  private constructor(licenseGate: LicenseGate) {
    this.records = new Map<string, ModelPermissionRecord>();
    this.licenseGate = licenseGate;
  }

  /**
   * Returns the singleton instance of ModelPermissions.
   * Accepts an optional LicenseGate override for dependency injection in tests.
   */
  public static getInstance(licenseGate?: LicenseGate): ModelPermissions {
    if (ModelPermissions.instance === null) {
      ModelPermissions.instance = new ModelPermissions(licenseGate ?? { isModelLicensed: () => true });
    }
    return ModelPermissions.instance;
  }

  /**
   * Resets the singleton instance. Intended for test isolation only.
   */
  public static resetInstance(): void {
    ModelPermissions.instance = null;
  }

  /**
   * Enables a model for use. Throws if the model is not licensed
   * according to the injected LicenseGate.
   */
  public enable(modelId: string): ModelPermissionRecord {
    if (!this.licenseGate.isModelLicensed(modelId)) {
      throw new Error(`Model "${modelId}" is not licensed and cannot be enabled.`);
    }

    const record: ModelPermissionRecord = {
      modelId,
      state: ModelPermissionState.ENABLED,
      updatedAt: new Date(),
    };

    this.records.set(modelId, record);
    return record;
  }

  /**
   * Disables a model, regardless of license state.
   */
  public disable(modelId: string): ModelPermissionRecord {
    const record: ModelPermissionRecord = {
      modelId,
      state: ModelPermissionState.DISABLED,
      updatedAt: new Date(),
    };

    this.records.set(modelId, record);
    return record;
  }

  /**
   * Returns true if the given model is currently ENABLED.
   */
  public isEnabled(modelId: string): boolean {
    return this.records.get(modelId)?.state === ModelPermissionState.ENABLED;
  }

  /**
   * Returns true if the given model is currently licensed, independent
   * of its enabled/disabled state.
   */
  public isLicensed(modelId: string): boolean {
    return this.licenseGate.isModelLicensed(modelId);
  }

  /**
   * Returns the permission record for a model, if one has been set.
   */
  public find(modelId: string): ModelPermissionRecord | null {
    return this.records.get(modelId) ?? null;
  }

  /**
   * Lists every model with an explicit permission record.
   */
  public list(): readonly ModelPermissionRecord[] {
    return Array.from(this.records.values());
  }
}