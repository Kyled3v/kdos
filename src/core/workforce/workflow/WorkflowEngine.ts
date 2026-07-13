/**
 * WorkflowEngine.ts
 *
 * Location: src/core/workforce/workflow/WorkflowEngine.ts
 *
 * WorkflowEngine manages execution state for in-flight workflows. It
 * tracks which tasks are running, completed, or failed against a
 * given ExecutionPlan, and maintains each Workflow's lifecycle status
 * and progress.
 *
 * WorkflowEngine is pure state management. It never calls AI, never
 * performs executive reasoning, never creates or selects employees,
 * and never dispatches tasks — it only records what has happened and
 * reports the current state of each workflow.
 *
 * NOTE ON IMPORTS:
 * ExecutionPlan and ExecutionResult are imported from their existing
 * locations rather than redefined here. Adjust the paths below if the
 * actual module locations differ:
 *   - ExecutionPlan:   '../../executive/ExecutionPlanner'
 *   - ExecutionResult: '../execution/ExecutionEngine'
 */

import type { ExecutionPlan } from '../../executive/ExecutionPlanner'
import type { ExecutionResult } from '../execution/ExecutionEngine'

/**
 * The lifecycle status of a Workflow.
 */
export type WorkflowStatus =
  | 'Pending'
  | 'Running'
  | 'Paused'
  | 'Completed'
  | 'Failed'
  | 'Cancelled'

/**
 * The tracked state of a single workflow run against an
 * ExecutionPlan.
 */
export interface Workflow {
  readonly id: string
  readonly executionPlanId: string
  readonly status: WorkflowStatus
  readonly startedAt: Date | null
  readonly completedAt: Date | null
  readonly completedTasks: string[]
  readonly failedTasks: string[]
  readonly activeTasks: string[]
  readonly progress: number
}

/**
 * WorkflowEngine
 *
 * Single responsibility: create and track Workflow state for
 * ExecutionPlans as their tasks complete or fail, over time.
 *
 * This class:
 *   - Performs no AI calls.
 *   - Performs no executive reasoning or decision-making.
 *   - Never creates, selects, or dispatches employees or tasks.
 *   - Owns all Workflow records it creates; callers interact with
 *     workflows only through this engine's methods.
 *   - Is dependency-injection ready: it takes no external
 *     dependencies, so it can be constructed freely or supplied
 *     wherever a WorkflowEngine is required.
 */
export class WorkflowEngine {
  /**
   * Internal workflow store, keyed by workflow id.
   */
  private readonly workflows = new Map<string, Workflow>()

  /**
   * Internal record of each workflow's total expected task count,
   * derived from its ExecutionPlan at creation time. Used to
   * calculate progress without re-deriving it from the plan on every
   * update.
   */
  private readonly totalTasksByWorkflow = new Map<string, number>()

  /**
   * Creates a new Workflow in "Pending" status for the given
   * ExecutionPlan. The plan itself is not modified.
   *
   * @param plan - The ExecutionPlan this workflow will track.
   * @returns The newly created Workflow.
   */
  public createWorkflow(plan: ExecutionPlan): Workflow {
    const workflow: Workflow = Object.freeze({
      id: this.generateWorkflowId(),
      executionPlanId: plan.id,
      status: 'Pending',
      startedAt: null,
      completedAt: null,
      completedTasks: [],
      failedTasks: [],
      activeTasks: [],
      progress: 0,
    })

    this.workflows.set(workflow.id, workflow)
    this.totalTasksByWorkflow.set(workflow.id, plan.totalUnits)

    return workflow
  }

  /**
   * Transitions a workflow into "Running" status and records its
   * start time, if it has not already started.
   *
   * @param workflowId - The id of the workflow to start.
   * @throws Error if no workflow exists for the given id.
   */
  public start(workflowId: string): void {
    const workflow = this.requireWorkflow(workflowId)

    this.save({
      ...workflow,
      status: 'Running',
      startedAt: workflow.startedAt ?? new Date(),
    })
  }

  /**
   * Transitions a running workflow into "Paused" status. Has no
   * effect on workflows that are not currently running, beyond
   * requiring the workflow to exist.
   *
   * @param workflowId - The id of the workflow to pause.
   * @throws Error if no workflow exists for the given id.
   */
  public pause(workflowId: string): void {
    const workflow = this.requireWorkflow(workflowId)

    if (workflow.status !== 'Running') {
      return
    }

    this.save({
      ...workflow,
      status: 'Paused',
    })
  }

  /**
   * Transitions a paused workflow back into "Running" status. Has no
   * effect on workflows that are not currently paused, beyond
   * requiring the workflow to exist.
   *
   * @param workflowId - The id of the workflow to resume.
   * @throws Error if no workflow exists for the given id.
   */
  public resume(workflowId: string): void {
    const workflow = this.requireWorkflow(workflowId)

    if (workflow.status !== 'Paused') {
      return
    }

    this.save({
      ...workflow,
      status: 'Running',
    })
  }

  /**
   * Records a successful task completion against a workflow: moves
   * the task out of activeTasks (if present) and into
   * completedTasks, recalculates progress, and marks the workflow as
   * "Completed" once every expected task has finished (successfully
   * or not).
   *
   * @param workflowId - The id of the workflow this result belongs to.
   * @param result - The ExecutionResult describing the completed task.
   * @throws Error if no workflow exists for the given id.
   */
  public completeTask(workflowId: string, result: ExecutionResult): void {
    const workflow = this.requireWorkflow(workflowId)

    const activeTasks = this.removeTask(workflow.activeTasks, result.taskId)
    const completedTasks = this.addTaskIfAbsent(workflow.completedTasks, result.taskId)

    this.applyTaskOutcome(workflow, {
      activeTasks,
      completedTasks,
      failedTasks: workflow.failedTasks,
    })
  }

  /**
   * Records a failed task against a workflow: moves the task out of
   * activeTasks (if present) and into failedTasks, recalculates
   * progress, and marks the workflow as "Failed" once every expected
   * task has finished (successfully or not) and at least one task
   * failed.
   *
   * @param workflowId - The id of the workflow this result belongs to.
   * @param result - The ExecutionResult describing the failed task.
   * @throws Error if no workflow exists for the given id.
   */
  public failTask(workflowId: string, result: ExecutionResult): void {
    const workflow = this.requireWorkflow(workflowId)

    const activeTasks = this.removeTask(workflow.activeTasks, result.taskId)
    const failedTasks = this.addTaskIfAbsent(workflow.failedTasks, result.taskId)

    this.applyTaskOutcome(workflow, {
      activeTasks,
      completedTasks: workflow.completedTasks,
      failedTasks,
    })
  }

  /**
   * Retrieves the current state of a workflow by id.
   *
   * @param workflowId - The id of the workflow to retrieve.
   * @returns The Workflow, or undefined if no workflow exists for
   *          the given id.
   */
  public getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId)
  }

  /**
   * Applies an updated set of task-tracking arrays to a workflow,
   * recalculating progress and lifecycle status accordingly, then
   * persists the result.
   */
  private applyTaskOutcome(
    workflow: Workflow,
    updated: Pick<Workflow, 'activeTasks' | 'completedTasks' | 'failedTasks'>
  ): void {
    const totalTasks = this.totalTasksByWorkflow.get(workflow.id) ?? 0
    const finishedCount = updated.completedTasks.length + updated.failedTasks.length
    const progress = this.calculateProgress(finishedCount, totalTasks)

    const isFinished = totalTasks > 0 && finishedCount >= totalTasks
    const hasFailures = updated.failedTasks.length > 0

    const status: WorkflowStatus = isFinished
      ? hasFailures
        ? 'Failed'
        : 'Completed'
      : workflow.status

    this.save({
      ...workflow,
      ...updated,
      progress,
      status,
      completedAt: isFinished ? workflow.completedAt ?? new Date() : workflow.completedAt,
    })
  }

  /**
   * Calculates progress as a percentage (0-100) of finished tasks
   * out of total expected tasks. Returns 0 when total is unknown or
   * zero, to avoid division by zero.
   */
  private calculateProgress(finishedCount: number, totalTasks: number): number {
    if (totalTasks <= 0) {
      return 0
    }
    const ratio = finishedCount / totalTasks
    return Math.min(100, Math.round(ratio * 100))
  }

  /**
   * Returns a new array with the given task id removed, if present.
   * Does not mutate the input array.
   */
  private removeTask(tasks: string[], taskId: string): string[] {
    return tasks.filter((id) => id !== taskId)
  }

  /**
   * Returns a new array with the given task id appended, unless it
   * is already present. Does not mutate the input array.
   */
  private addTaskIfAbsent(tasks: string[], taskId: string): string[] {
    return tasks.includes(taskId) ? [...tasks] : [...tasks, taskId]
  }

  /**
   * Persists an updated Workflow record, replacing the previous
   * version for that workflow's id.
   */
  private save(workflow: Workflow): void {
    this.workflows.set(workflow.id, Object.freeze(workflow))
  }

  /**
   * Retrieves a workflow by id or throws if none exists, so calling
   * methods can operate on a guaranteed-defined Workflow.
   */
  private requireWorkflow(workflowId: string): Workflow {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`WorkflowEngine: no workflow found for id "${workflowId}".`)
    }
    return workflow
  }

  /**
   * Generates a deterministic-format workflow identifier.
   */
  private generateWorkflowId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}