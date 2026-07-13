/**
 * ExecutionEngine.ts
 *
 * Location: src/core/workforce/execution/ExecutionEngine.ts
 *
 * ExecutionEngine is the bridge between planning and execution. It
 * pulls tasks off an existing TaskQueue, resolves the assigned
 * employee from EmployeeRegistry, sends the work to AIGateway, and
 * records the outcome as an ExecutionResult.
 *
 * ExecutionEngine performs no executive reasoning of any kind — it
 * does not decide what work exists, how it should be grouped, or
 * whether it is safe to run. Those decisions have already been made
 * upstream by the Executive layer. ExecutionEngine only orchestrates
 * the mechanical act of running the next available task.
 *
 * NOTE ON IMPORTS:
 * This file imports its dependencies from their existing locations
 * rather than redefining them. Adjust the paths below if the actual
 * module locations differ:
 *   - TaskQueue, QueuedTask: '../tasks/TaskQueue'
 *   - EmployeeRegistry:      '../registry/EmployeeRegistry'
 *   - BaseEmployee:          '../employees/BaseEmployee'
 *   - AIGateway:             '../gateway/AIGateway'
 *
 * NOTE ON AIGateway CONTRACT:
 * AIGateway is assumed to expose a `send` method accepting the
 * resolved employee and queued task, returning a plain string
 * response:
 *     send(employee: BaseEmployee, task: QueuedTask): Promise<string>
 * Adjust `sendToGateway` below if the real AIGateway signature
 * differs — no other part of this file depends on that detail.
 */

import { TaskQueue } from '../tasks/TaskQueue'
import type { QueuedTask } from '../tasks/TaskQueue'
import { EmployeeRegistry } from '../registry/EmployeeRegistry'
import type { BaseEmployee } from '../employees/BaseEmployee'
import { AIGateway } from '../gateway/AIGateway'

/**
 * The recorded outcome of executing a single QueuedTask.
 */
export interface ExecutionResult {
  readonly taskId: string
  readonly employeeId: string
  readonly success: boolean
  readonly startedAt: Date
  readonly completedAt: Date
  readonly durationMs: number
  readonly response: string
  readonly error: string | null
}

/**
 * ExecutionEngine
 *
 * Single responsibility: take the next task from an existing
 * TaskQueue, resolve its employee via EmployeeRegistry, execute it
 * through AIGateway, and return the resulting ExecutionResult.
 *
 * This class:
 *   - Performs no executive reasoning or decision-making.
 *   - Never modifies TaskQueue, EmployeeRegistry, or AIGateway
 *     beyond the read/dequeue operations each already exposes.
 *   - Is dependency-injection ready: TaskQueue, EmployeeRegistry, and
 *     AIGateway are all supplied via the constructor.
 */
export class ExecutionEngine {
  private readonly taskQueue: TaskQueue
  private readonly employeeRegistry: EmployeeRegistry
  private readonly aiGateway: AIGateway

  public constructor(
    taskQueue: TaskQueue,
    employeeRegistry: EmployeeRegistry,
    aiGateway: AIGateway
  ) {
    this.taskQueue = taskQueue
    this.employeeRegistry = employeeRegistry
    this.aiGateway = aiGateway
  }

  /**
   * Executes the single next task in the TaskQueue, if one exists.
   *
   * Workflow:
   *   1. Dequeue the next task from TaskQueue.
   *   2. Resolve the assigned employee from EmployeeRegistry.
   *   3. Send the request to AIGateway.
   *   4. Receive the AI response.
   *   5. Return the resulting ExecutionResult.
   *
   * @returns The ExecutionResult for the executed task, or null if
   *          the queue was empty.
   */
  public async executeNext(): Promise<ExecutionResult | null> {
    const task = this.taskQueue.dequeue()
    if (!task) {
      return null
    }

    return this.executeTask(task)
  }

  /**
   * Repeatedly executes tasks from the TaskQueue until it is empty,
   * returning every ExecutionResult in the order the tasks were
   * executed.
   *
   * @returns All ExecutionResults produced during this run, in
   *          execution order.
   */
  public async executeAll(): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = []

    let result = await this.executeNext()
    while (result !== null) {
      results.push(result)
      result = await this.executeNext()
    }

    return results
  }

  /**
   * Executes a single QueuedTask: resolves its employee, sends it to
   * AIGateway, and produces an ExecutionResult regardless of whether
   * the underlying call succeeds or fails.
   */
  private async executeTask(task: QueuedTask): Promise<ExecutionResult> {
    const startedAt = new Date()

    const employee = this.resolveEmployee(task.employeeId)

    if (!employee) {
      const completedAt = new Date()
      return Object.freeze({
        taskId: task.id,
        employeeId: task.employeeId,
        success: false,
        startedAt,
        completedAt,
        durationMs: this.durationMs(startedAt, completedAt),
        response: '',
        error: `ExecutionEngine: no employee could be resolved for id "${task.employeeId}".`,
      })
    }

    try {
      const response = await this.sendToGateway(employee, task)
      const completedAt = new Date()

      return Object.freeze({
        taskId: task.id,
        employeeId: employee.id,
        success: true,
        startedAt,
        completedAt,
        durationMs: this.durationMs(startedAt, completedAt),
        response,
        error: null,
      })
    } catch (caught) {
      const completedAt = new Date()

      return Object.freeze({
        taskId: task.id,
        employeeId: employee.id,
        success: false,
        startedAt,
        completedAt,
        durationMs: this.durationMs(startedAt, completedAt),
        response: '',
        error: this.describeError(caught),
      })
    }
  }

  /**
   * Resolves an employee by id via EmployeeRegistry. Returns
   * undefined if no matching employee is found.
   */
  private resolveEmployee(employeeId: string): BaseEmployee | undefined {
    return this.employeeRegistry.getById(employeeId)
  }

  /**
   * Sends a resolved employee/task pairing to AIGateway and returns
   * the raw response.
   */
  private async sendToGateway(
    employee: BaseEmployee,
    task: QueuedTask
  ): Promise<string> {
    return this.aiGateway.send(employee, task)
  }

  /**
   * Computes elapsed milliseconds between two Date instances.
   */
  private durationMs(startedAt: Date, completedAt: Date): number {
    return completedAt.getTime() - startedAt.getTime()
  }

  /**
   * Normalizes an unknown thrown value into a human-readable error
   * message string.
   */
  private describeError(caught: unknown): string {
    if (caught instanceof Error) {
      return caught.message
    }
    return String(caught)
  }
}