import type { BaseEmployee } from "../employee/BaseEmployee";
import type { EmployeeRole, EmployeeDepartment } from "../employee/types";

/**
 * Singleton registry responsible for tracking every AI employee active
 * within KDOS. All employee lifecycle management flows through this
 * registry.
 */
export class EmployeeRegistry {
  private static instance: EmployeeRegistry | null = null;

  private readonly employees: Map<string, BaseEmployee>;

  private constructor() {
    this.employees = new Map<string, BaseEmployee>();
  }

  /**
   * Returns the singleton instance of the registry.
   */
  public static getInstance(): EmployeeRegistry {
    if (EmployeeRegistry.instance === null) {
      EmployeeRegistry.instance = new EmployeeRegistry();
    }

    return EmployeeRegistry.instance;
  }

  /**
   * Registers a new employee. Throws if an employee with the same id
   * is already registered.
   */
  public register(employee: BaseEmployee): void {
    if (!employee) {
      throw new Error("EmployeeRegistry: employee is required.");
    }

    if (this.employees.has(employee.id)) {
      throw new Error(
        `EmployeeRegistry: employee with id "${employee.id}" is already registered.`
      );
    }

    this.employees.set(employee.id, employee);
  }

  /**
   * Removes an employee from the registry by id. Throws if the
   * employee does not exist.
   */
  public unregister(employeeId: string): void {
    if (!employeeId) {
      throw new Error("EmployeeRegistry: employeeId is required.");
    }

    if (!this.employees.has(employeeId)) {
      throw new Error(
        `EmployeeRegistry: employee with id "${employeeId}" does not exist.`
      );
    }

    this.employees.delete(employeeId);
  }

  /**
   * Retrieves a single employee by id. Throws if the employee does
   * not exist.
   */
  public get(employeeId: string): BaseEmployee {
    if (!employeeId) {
      throw new Error("EmployeeRegistry: employeeId is required.");
    }

    const employee = this.employees.get(employeeId);

    if (!employee) {
      throw new Error(
        `EmployeeRegistry: employee with id "${employeeId}" does not exist.`
      );
    }

    return employee;
  }

  /**
   * Returns all registered employees.
   */
  public getAll(): BaseEmployee[] {
    return Array.from(this.employees.values());
  }

  /**
   * Returns all employees matching the given role. Throws if no role
   * is provided.
   */
  public getByRole(role: EmployeeRole): BaseEmployee[] {
    if (!role) {
      throw new Error("EmployeeRegistry: role is required.");
    }

    return this.getAll().filter(
      (employee) => employee.role === role
    );
  }

  /**
   * Returns all employees matching the given department. Throws if no
   * department is provided.
   */
  public getByDepartment(department: EmployeeDepartment): BaseEmployee[] {
    if (!department) {
      throw new Error("EmployeeRegistry: department is required.");
    }

    return this.getAll().filter(
      (employee) => employee.department === department
    );
  }

  /**
   * Returns all employees currently available (idle status) for task
   * assignment.
   */
  public getAvailable(): BaseEmployee[] {
    return this.getAll().filter(
      (employee) => employee.getProfile().status === "idle"
    );
  }

  /**
   * Replaces an existing employee record with an updated instance.
   * Throws if the employee does not already exist.
   */
  public update(employee: BaseEmployee): void {
    if (!employee) {
      throw new Error("EmployeeRegistry: employee is required.");
    }

    if (!this.employees.has(employee.id)) {
      throw new Error(
        `EmployeeRegistry: cannot update employee "${employee.id}" because it does not exist.`
      );
    }

    this.employees.set(employee.id, employee);
  }

  /**
   * Checks whether an employee with the given id exists.
   */
  public exists(employeeId: string): boolean {
    if (!employeeId) {
      throw new Error("EmployeeRegistry: employeeId is required.");
    }

    return this.employees.has(employeeId);
  }

  /**
   * Returns the total number of registered employees.
   */
  public count(): number {
    return this.employees.size;
  }

  /**
   * Removes all employees from the registry.
   */
  public clear(): void {
    this.employees.clear();
  }
}

export const employeeRegistry = EmployeeRegistry.getInstance();