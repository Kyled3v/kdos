/**
 * ServicePackage
 *
 * Represents a single real, sellable KyleDev service offering within the
 * master catalogue. Immutable value object. This is the shape consumed
 * by CRM, Proposal Engine, Quotation Engine, Project Engine, Invoice
 * Engine, Sales AI, Marketing AI, Customer Success, the public website,
 * and the desktop app.
 */

import { ServiceCategory } from "./ServiceCategory";
import { ServicePricing } from "./ServicePricing";

export enum ServicePriority {
  CORE = "CORE",
  HIGH_DEMAND = "HIGH_DEMAND",
  STANDARD = "STANDARD",
  SPECIALIST = "SPECIALIST",
}

export interface ServicePackageProps {
  readonly id: string;
  readonly name: string;
  readonly category: ServiceCategory;
  readonly description: string;
  readonly estimatedDurationWeeks: { readonly min: number; readonly max: number };
  readonly pricing: ServicePricing;
  readonly minimumTeamSize: number;
  readonly deliverables: readonly string[];
  readonly recommendedAddOnIds: readonly string[];
  readonly requiredEmployeeRoles: readonly string[];
  readonly priority: ServicePriority;
}

export class ServicePackage {
  public readonly id: string;
  public readonly name: string;
  public readonly category: ServiceCategory;
  public readonly description: string;
  public readonly estimatedDurationWeeks: { readonly min: number; readonly max: number };
  public readonly pricing: ServicePricing;
  public readonly minimumTeamSize: number;
  public readonly deliverables: readonly string[];
  public readonly recommendedAddOnIds: readonly string[];
  public readonly requiredEmployeeRoles: readonly string[];
  public readonly priority: ServicePriority;

  private constructor(props: ServicePackageProps) {
    this.id = props.id;
    this.name = props.name;
    this.category = props.category;
    this.description = props.description;
    this.estimatedDurationWeeks = props.estimatedDurationWeeks;
    this.pricing = props.pricing;
    this.minimumTeamSize = props.minimumTeamSize;
    this.deliverables = props.deliverables;
    this.recommendedAddOnIds = props.recommendedAddOnIds;
    this.requiredEmployeeRoles = props.requiredEmployeeRoles;
    this.priority = props.priority;
  }

  /**
   * Creates a new ServicePackage. Throws if required fields are invalid.
   */
  public static create(props: ServicePackageProps): ServicePackage {
    if (!props.id || props.id.trim().length === 0) {
      throw new Error("ServicePackage requires a non-empty id.");
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new Error("ServicePackage requires a non-empty name.");
    }
    if (!props.description || props.description.trim().length === 0) {
      throw new Error("ServicePackage requires a non-empty description.");
    }
    if (props.deliverables.length === 0) {
      throw new Error("ServicePackage requires at least one deliverable.");
    }
    if (props.requiredEmployeeRoles.length === 0) {
      throw new Error("ServicePackage requires at least one required employee role.");
    }
    if (props.minimumTeamSize <= 0) {
      throw new Error("ServicePackage minimumTeamSize must be greater than zero.");
    }
    if (props.estimatedDurationWeeks.min <= 0 || props.estimatedDurationWeeks.max < props.estimatedDurationWeeks.min) {
      throw new Error("ServicePackage estimatedDurationWeeks must have a positive, non-decreasing range.");
    }

    return new ServicePackage(props);
  }

  /**
   * Returns the estimated duration formatted as a human-readable range.
   */
  public durationLabel(): string {
    const { min, max } = this.estimatedDurationWeeks;
    return min === max ? `${min} week${min === 1 ? "" : "s"}` : `${min}-${max} weeks`;
  }

  /**
   * Returns true if this package recommends the given add-on service id.
   */
  public recommendsAddOn(serviceId: string): boolean {
    return this.recommendedAddOnIds.includes(serviceId);
  }

  /**
   * Returns a plain serialisable snapshot of this package.
   */
  public toSnapshot(): ServicePackageProps {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      description: this.description,
      estimatedDurationWeeks: this.estimatedDurationWeeks,
      pricing: this.pricing,
      minimumTeamSize: this.minimumTeamSize,
      deliverables: this.deliverables,
      recommendedAddOnIds: this.recommendedAddOnIds,
      requiredEmployeeRoles: this.requiredEmployeeRoles,
      priority: this.priority,
    };
  }
}