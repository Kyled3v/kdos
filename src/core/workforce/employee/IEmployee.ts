import type {
  EmployeeTask,
  EmployeeMemory,
  EmployeeProfile,
} from "./types";

/**
 * The contract every AI employee in KDOS must implement, regardless of
 * role or department. This interface defines the complete lifecycle
 * surface of an employee: initialization, task execution, memory, tool
 * use, and profile reporting.
 */
export interface IEmployee {
  /**
   * Prepares the employee for active duty.
   */
  initialize(): Promise<void>;

  /**
   * Executes a natural-language instruction and returns the result.
   */
  execute(input: string): Promise<string>;

  /**
   * Determines whether this employee is capable of executing the
   * given task.
   */
  canExecute(task: EmployeeTask): boolean;

  /**
   * Assigns a task to this employee.
   */
  assignTask(task: EmployeeTask): Promise<void>;

  /**
   * Marks the specified task as completed.
   */
  completeTask(taskId: string): Promise<void>;

  /**
   * Marks the specified task as failed with a reason.
   */
  failTask(taskId: string, reason: string): Promise<void>;

  /**
   * Stores a new memory entry for this employee.
   */
  remember(memory: EmployeeMemory): Promise<void>;

  /**
   * Invokes a named tool with the given input and returns its result.
   */
  useTool(toolName: string, input: unknown): Promise<unknown>;

  /**
   * Returns a snapshot of this employee's public profile.
   */
  getProfile(): EmployeeProfile;
}