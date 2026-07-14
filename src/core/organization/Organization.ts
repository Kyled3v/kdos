/**
 * Organization.ts
 *
 * Location: src/core/organization/Organization.ts
 *
 * Organization is the root domain model of KDOS. Everything in the
 * platform — Departments, Employees, Clients, Projects, and
 * Workflows — belongs to an Organization. This file defines that
 * root model along with Department, and OrganizationManager, the
 * in-memory manager responsible for creating organizations and
 * managing their departments.
 *
 * This file contains no AI logic, no authentication, and no
 * persistence beyond an in-memory store — it is a pure domain/data
 * layer.
 */

/**
 * The root entity every other part of KDOS belongs to.
 */
export interface Organization {
  readonly id: string
  readonly name: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * The set of department types an Organization can contain.
 */
export enum DepartmentType {
  EXECUTIVE = 'EXECUTIVE',
  ENGINEERING = 'ENGINEERING',
  DESIGN = 'DESIGN',
  MARKETING = 'MARKETING',
  SALES = 'SALES',
  FINANCE = 'FINANCE',
  SUPPORT = 'SUPPORT',
  HR = 'HR',
  OPERATIONS = 'OPERATIONS',
}

/**
 * A single department belonging to an Organization.
 */
export interface Department {
  readonly id: string
  readonly organizationId: string
  readonly name: string
  readonly type: DepartmentType
  readonly description: string
  readonly managerId: string | null
}

/**
 * OrganizationManager
 *
 * Single responsibility: create Organizations and manage the
 * Departments that belong to them, entirely in memory.
 *
 * This class:
 *   - Uses no database or filesystem; all state lives in memory for
 *     the lifetime of this instance.
 *   - Performs no AI calls.
 *   - Performs no authentication or authorization — callers are
 *     assumed to already be authorized by the time they reach this
 *     class.
 *   - Never mutates a returned Organization or Department in place;
 *     every change produces a new, frozen record.
 */
export class OrganizationManager {
  /**
   * Internal in-memory organization store, keyed by organization id.
   */
  private readonly organizations = new Map<string, Organization>()

  /**
   * Internal in-memory department store, keyed by department id.
   */
  private readonly departments = new Map<string, Department>()

  /**
   * Creates a new Organization with the given name.
   *
   * @param name - The organization's display name.
   * @returns The newly created Organization.
   */
  public createOrganization(name: string): Organization {
    const now = new Date()

    const organization: Organization = Object.freeze({
      id: this.generateId('org'),
      name,
      createdAt: now,
      updatedAt: now,
    })

    this.organizations.set(organization.id, organization)
    return organization
  }

  /**
   * Adds a new Department to an existing Organization.
   *
   * @param organizationId - The id of the owning Organization.
   * @param name - The department's display name.
   * @param type - The department's DepartmentType.
   * @param description - A description of the department's purpose.
   * @param managerId - The id of the employee managing this
   *        department, or null if unassigned.
   * @returns The newly created Department.
   * @throws Error if no Organization exists for the given id.
   */
  public addDepartment(
    organizationId: string,
    name: string,
    type: DepartmentType,
    description: string,
    managerId: string | null = null
  ): Department {
    const organization = this.requireOrganization(organizationId)

    const department: Department = Object.freeze({
      id: this.generateId('dept'),
      organizationId: organization.id,
      name,
      type,
      description,
      managerId,
    })

    this.departments.set(department.id, department)
    this.touchOrganization(organization.id)

    return department
  }

  /**
   * Removes a Department from its Organization.
   *
   * @param departmentId - The id of the Department to remove.
   * @throws Error if no Department exists for the given id.
   */
  public removeDepartment(departmentId: string): void {
    const department = this.requireDepartment(departmentId)

    this.departments.delete(departmentId)
    this.touchOrganization(department.organizationId)
  }

  /**
   * Renames an existing Department. May optionally update its
   * description in the same call.
   *
   * @param departmentId - The id of the Department to rename.
   * @param name - The department's new display name.
   * @param description - The department's new description. If
   *        omitted, the existing description is preserved.
   * @returns The updated Department.
   * @throws Error if no Department exists for the given id.
   */
  public renameDepartment(
    departmentId: string,
    name: string,
    description?: string
  ): Department {
    const department = this.requireDepartment(departmentId)

    const updated: Department = Object.freeze({
      ...department,
      name,
      description: description ?? department.description,
    })

    this.departments.set(departmentId, updated)
    this.touchOrganization(department.organizationId)

    return updated
  }

  /**
   * Retrieves every Department belonging to a given Organization.
   *
   * @param organizationId - The id of the owning Organization.
   * @returns The Organization's Departments. Empty if the
   *          organization has none, or does not exist.
   */
  public getDepartments(organizationId: string): Department[] {
    return [...this.departments.values()].filter(
      (department) => department.organizationId === organizationId
    )
  }

  /**
   * Retrieves a single Department by id.
   *
   * @param departmentId - The id of the Department to retrieve.
   * @returns The Department, or undefined if no Department exists
   *          for the given id.
   */
  public getDepartment(departmentId: string): Department | undefined {
    return this.departments.get(departmentId)
  }

  /**
   * Retrieves a single Organization by id.
   *
   * @param organizationId - The id of the Organization to retrieve.
   * @returns The Organization, or undefined if no Organization
   *          exists for the given id.
   */
  public getOrganization(organizationId: string): Organization | undefined {
    return this.organizations.get(organizationId)
  }

  /**
   * Retrieves an Organization by id or throws if none exists, so
   * calling methods can operate on a guaranteed-defined Organization.
   */
  private requireOrganization(organizationId: string): Organization {
    const organization = this.organizations.get(organizationId)
    if (!organization) {
      throw new Error(`OrganizationManager: no organization found for id "${organizationId}".`)
    }
    return organization
  }

  /**
   * Retrieves a Department by id or throws if none exists, so
   * calling methods can operate on a guaranteed-defined Department.
   */
  private requireDepartment(departmentId: string): Department {
    const department = this.departments.get(departmentId)
    if (!department) {
      throw new Error(`OrganizationManager: no department found for id "${departmentId}".`)
    }
    return department
  }

  /**
   * Updates an Organization's updatedAt timestamp to reflect a change
   * to one of its owned entities (e.g. its departments).
   */
  private touchOrganization(organizationId: string): void {
    const organization = this.organizations.get(organizationId)
    if (!organization) {
      return
    }

    this.organizations.set(
      organizationId,
      Object.freeze({
        ...organization,
        updatedAt: new Date(),
      })
    )
  }

  /**
   * Generates a deterministic-format, prefixed identifier.
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}