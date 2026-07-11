import { employeeRegistry } from "../registry/EmployeeRegistry";
import type { BaseEmployee } from "../employee/BaseEmployee";
import type { EmployeeTask } from "../employee/types";

/**
 * Internal record tracking a task currently running with an assigned
 * employee.
 */
interface RunningTaskRecord {
  readonly task: EmployeeTask;
  readonly employeeId: string;
}

/**
 * Singleton dispatcher responsible for routing tasks to available AI
 * employees, tracking task lifecycle, and keeping employee status in
 * sync with task assignment.
 */
export class TaskDispatcher {
  private static instance: TaskDispatcher | null = null;

  private readonly queued: Map<string, EmployeeTask>;
  private readonly runningTasks: Map<string, RunningTaskRecord>;
  private readonly completedTasks: Map<string, EmployeeTask>;
  private readonly failedTasks: Map<string, EmployeeTask>;

  private constructor() {
    this.queued = new Map<string, EmployeeTask>();
    this.runningTasks = new Map<string, RunningTaskRecord>();
    this.completedTasks = new Map<string, EmployeeTask>();
    this.failedTasks = new Map<string, EmployeeTask>();
  }

  /**
   * Returns the singleton instance of the dispatcher.
   */
  public static getInstance(): TaskDispatcher {
    if (TaskDispatcher.instance === null) {
      TaskDispatcher.instance = new TaskDispatcher();
    }

    return TaskDispatcher.instance;
  }

  /**
   * Dispatches a task into the system. Attempts to find and assign an
   * available employee immediately; if none is available, the task is
   * placed in the queue. Throws if the task is invalid or already
   * tracked.
   */
  public dispatch(task: EmployeeTask): void {
    this.validateTask(task);
    this.ensureTaskNotTracked(task.id);

    let employee: BaseEmployee;

    try {
      employee = this.findBestEmployee(task);
    } catch {
      this.queued.set(task.id, task);
      return;
    }

    this.assign(employee.id, task);
  }

  /**
   * Assigns a specific task to a specific employee. Throws if the
   * employee does not exist, is unavailable, cannot execute the task,
   * or the task is already assigned elsewhere.
   */
  public assign(employeeId: string, task: EmployeeTask): void {
    this.validateTask(task);

    if (!employeeId) {
      throw new Error("TaskDispatcher: employeeId is required.");
    }

    if (this.runningTasks.has(task.id)) {
      throw new Error(
        `TaskDispatcher: task "${task.id}" is already assigned to an employee.`
      );
    }

    const employee = employeeRegistry.get(employeeId);

    if (employee.getProfile().status !== "idle") {
      throw new Error(
        `TaskDispatcher: employee "${employeeId}" is not available (status: ${employee.getProfile().status}).`
      );
    }

    employee.assignTask(task);

    this.queued.delete(task.id);
    this.runningTasks.set(task.id, { task, employeeId });
  }

  /**
   * Finds the best available employee capable of executing the given
   * task. Throws if no suitable employee is available.
   */
  public findBestEmployee(task: EmployeeTask): BaseEmployee {
    this.validateTask(task);

    const candidates = employeeRegistry
      .getAvailable()
      .filter((employee) => employee.canExecute(task));

    return this.selectEmployee(candidates, task.id);
  }

  /**
   * Validates a candidate list of employees and returns the selected
   * employee. Never indexes the array directly — the array is checked
   * for emptiness first, and the selected entry is verified to exist
   * before being returned. Throws a descriptive error if the
   * candidate list is empty or malformed.
   */
  private selectEmployee(
    candidates: BaseEmployee[],
    taskId: string
  ): BaseEmployee {
    if (!Array.isArray(candidates)) {
      throw new Error(
        `TaskDispatcher: candidate list for task "${taskId}" is not an array.`
      );
    }

    if (candidates.length === 0) {
      throw new Error(
        `TaskDispatcher: no available employee can execute task "${taskId}".`
      );
    }

    const selected = candidates.find((candidate) => candidate !== undefined);

    if (!selected) {
      throw new Error(
        `TaskDispatcher: candidate list for task "${taskId}" contained no valid employee.`
      );
    }

    return selected;
  }

  /**
   * Reassigns a task, releasing it from its current employee (if
   * running) and attempting to dispatch it again. Throws if the task
   * is not currently tracked by the dispatcher.
   */
  public reassign(task: EmployeeTask): void {
    this.validateTask(task);

    const running = this.runningTasks.get(task.id);

    if (running) {
      const employee = employeeRegistry.get(running.employeeId);
      employee.failTask("Reassigned by dispatcher.");
      this.runningTasks.delete(task.id);
    } else if (!this.queued.has(task.id)) {
      throw new Error(
        `TaskDispatcher: task "${task.id}" is not tracked by the dispatcher.`
      );
    } else {
      this.queued.delete(task.id);
    }

    this.dispatch(task);
  }

  /**
   * Marks a running task as completed and frees its assigned employee.
   * Throws if the task is not currently running.
   */
  public complete(taskId: string): void {
    if (!taskId) {
      throw new Error("TaskDispatcher: taskId is required.");
    }

    const running = this.runningTasks.get(taskId);

    if (!running) {
      throw new Error(
        `TaskDispatcher: task "${taskId}" is not currently running.`
      );
    }

    const employee = employeeRegistry.get(running.employeeId);
    employee.completeTask();

    this.runningTasks.delete(taskId);
    this.completedTasks.set(taskId, running.task);
  }

  /**
   * Marks a running task as failed with a reason and frees its
   * assigned employee. Throws if the task is not currently running or
   * no reason is provided.
   */
  public fail(taskId: string, reason: string): void {
    if (!taskId) {
      throw new Error("TaskDispatcher: taskId is required.");
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("TaskDispatcher: reason is required.");
    }

    const running = this.runningTasks.get(taskId);

    if (!running) {
      throw new Error(
        `TaskDispatcher: task "${taskId}" is not currently running.`
      );
    }

    const employee = employeeRegistry.get(running.employeeId);
    employee.failTask(reason);

    this.runningTasks.delete(taskId);
    this.failedTasks.set(taskId, running.task);
  }

  /**
   * Cancels a task, removing it from the queue or, if running,
   * releasing its assigned employee back to idle. Throws if the task
   * is not tracked in either the queue or running set.
   */
  public cancel(taskId: string): void {
    if (!taskId) {
      throw new Error("TaskDispatcher: taskId is required.");
    }

    if (this.queued.has(taskId)) {
      this.queued.delete(taskId);
      return;
    }

    const running = this.runningTasks.get(taskId);

    if (!running) {
      throw new Error(
        `TaskDispatcher: task "${taskId}" is not tracked by the dispatcher.`
      );
    }

    const employee = employeeRegistry.get(running.employeeId);
    employee.failTask("Cancelled by dispatcher.");

    this.runningTasks.delete(taskId);
  }

  /**
   * Returns all tasks currently waiting for assignment.
   */
  public queue(): EmployeeTask[] {
    return Array.from(this.queued.values());
  }

  /**
   * Returns all tasks currently running with an assigned employee.
   */
  public running(): EmployeeTask[] {
    return Array.from(this.runningTasks.values()).map((record) => record.task);
  }

  /**
   * Returns all tasks that have completed successfully.
   */
  public completed(): EmployeeTask[] {
    return Array.from(this.completedTasks.values());
  }

  /**
   * Returns all tasks that have failed.
   */
  public failed(): EmployeeTask[] {
    return Array.from(this.failedTasks.values());
  }

  /**
   * Validates the shape of a task before it is dispatched, assigned,
   * or otherwise tracked.
   */
  private validateTask(task: EmployeeTask): void {
    if (!task) {
      throw new Error("TaskDispatcher: task is required.");
    }

    if (!task.id) {
      throw new Error("TaskDispatcher: task.id is required.");
    }

    if (!task.employeeId) {
      throw new Error("TaskDispatcher: task.employeeId is required.");
    }
  }

  /**
   * Ensures a task id is not already tracked anywhere in the
   * dispatcher's lifecycle maps. Throws if it is.
   */
  private ensureTaskNotTracked(taskId: string): void {
    if (
      this.queued.has(taskId) ||
      this.runningTasks.has(taskId) ||
      this.completedTasks.has(taskId) ||
      this.failedTasks.has(taskId)
    ) {
      throw new Error(
        `TaskDispatcher: task "${taskId}" is already tracked by the dispatcher.`
      );
    }
  }
}

export const taskDispatcher = TaskDispatcher.getInstance();