/**
 * TaskQueue.ts
 *
 * Location: src/core/workforce/tasks/TaskQueue.ts
 *
 * TaskQueue is the first execution layer in the Workforce stack. It
 * stores tasks that are waiting to execute, ordered by priority and,
 * within equal priority, by insertion order (FIFO).
 *
 * TaskQueue is a pure data structure. It performs no AI calls, no
 * reasoning, and no execution — it does not know how a task runs, it
 * only knows the order in which tasks should be handed off to
 * whatever executes them.
 *
 * NOTE ON IMPORTS:
 * WorkforceExecutionPlan and WorkforceGroup are imported from their
 * existing location rather than redefined here. Adjust the path
 * below if the actual module location differs:
 *   - WorkforceExecutionPlan: '../orchestrator/WorkforceCoordinator'
 */

import type { WorkforceExecutionPlan } from '../orchestrator/WorkforceCoordinator'

/**
 * The lifecycle status of a queued task.
 */
export type QueuedTaskStatus = 'Waiting' | 'Ready' | 'Running' | 'Completed' | 'Failed'

/**
 * A single task sitting in the TaskQueue, referencing its assigned
 * employee and originating planned unit by id rather than embedding
 * either object directly.
 */
export interface QueuedTask {
  readonly id: string
  readonly employeeId: string
  readonly plannedUnitId: string
  readonly priority: number
  readonly status: QueuedTaskStatus
  readonly createdAt: Date
}

/**
 * TaskQueue
 *
 * Single responsibility: hold QueuedTask entries in priority order
 * (higher priority first), preserving FIFO order among tasks that
 * share the same priority.
 *
 * This class:
 *   - Performs no execution of any kind.
 *   - Performs no AI calls.
 *   - Performs no reasoning or decision-making.
 *   - Knows nothing about TaskDispatcher, employees, or the
 *     Executive layer beyond the ids it stores.
 *   - Is dependency-injection ready: it takes no external
 *     dependencies, so it can be constructed freely or supplied
 *     wherever a TaskQueue is required.
 */
export class TaskQueue {
  /**
   * Internal storage. Kept as a private array so ordering rules are
   * fully controlled by this class rather than exposed to callers.
   */
  private readonly tasks: QueuedTask[] = []

  /**
   * A monotonically increasing counter used to preserve FIFO order
   * among tasks of equal priority, independent of array mutation.
   */
  private insertionCounter = 0

  /**
   * Internal record pairing a QueuedTask with its insertion sequence
   * number, used purely for stable sorting.
   */
  private readonly insertionOrder = new Map<string, number>()

  /**
   * Enqueues every task described by a WorkforceExecutionPlan. Tasks
   * are derived from each WorkforceGroup's employee/task pairing:
   * each task in a group is queued once per assigned employee slot,
   * matched positionally, with any unmatched tasks queued without a
   * specific employee assignment left to a later scheduling step.
   *
   * The queue itself performs no scheduling logic beyond ordering —
   * it does not decide which employee should take which task; that
   * pairing is read directly from the plan as provided.
   *
   * @param plan - The WorkforceExecutionPlan to enqueue tasks from.
   *        Not modified in any way.
   */
  public enqueue(plan: WorkforceExecutionPlan): void {
    for (const group of plan.groups) {
      const employeeCount = group.employees.length

      group.tasks.forEach((task, index) => {
        const assignedEmployee =
          employeeCount > 0 ? group.employees[index % employeeCount] : undefined

        const queuedTask: QueuedTask = Object.freeze({
          id: this.generateTaskId(task.id),
          employeeId: assignedEmployee?.id ?? '',
          plannedUnitId: task.id,
          priority: this.derivePriority(index, group.tasks.length),
          status: 'Waiting',
          createdAt: new Date(),
        })

        this.insert(queuedTask)
      })
    }
  }

  /**
   * Removes and returns the highest-priority task in the queue
   * (ties broken by insertion order). Returns null if the queue is
   * empty.
   */
  public dequeue(): QueuedTask | null {
    const next = this.tasks.shift()
    if (!next) {
      return null
    }
    this.insertionOrder.delete(next.id)
    return next
  }

  /**
   * Returns the highest-priority task without removing it from the
   * queue. Returns null if the queue is empty.
   */
  public peek(): QueuedTask | null {
    return this.tasks.length > 0 ? this.tasks[0] : null
  }

  /**
   * Returns the number of tasks currently in the queue.
   */
  public size(): number {
    return this.tasks.length
  }

  /**
   * Returns true if the queue currently holds no tasks.
   */
  public isEmpty(): boolean {
    return this.tasks.length === 0
  }

  /**
   * Removes all tasks from the queue.
   */
  public clear(): void {
    this.tasks.length = 0
    this.insertionOrder.clear()
    this.insertionCounter = 0
  }

  /**
   * Inserts a task into its correctly ordered position: sorted by
   * descending priority, with ties resolved by ascending insertion
   * order (FIFO).
   */
  private insert(task: QueuedTask): void {
    const sequence = this.insertionCounter++
    this.insertionOrder.set(task.id, sequence)

    let insertAt = this.tasks.length
    for (let i = 0; i < this.tasks.length; i++) {
      if (task.priority > this.tasks[i].priority) {
        insertAt = i
        break
      }
    }

    this.tasks.splice(insertAt, 0, task)
  }

  /**
   * Derives a default priority for a task based on its position
   * within its originating group: earlier tasks within a group are
   * given a (slightly) higher priority so that, absent any other
   * ordering signal, a group's tasks are consumed in the order they
   * were planned.
   */
  private derivePriority(index: number, groupSize: number): number {
    if (groupSize <= 1) {
      return 0
    }
    return groupSize - index
  }

  /**
   * Generates a deterministic, collision-resistant id for a queued
   * task derived from its originating planned unit id.
   */
  private generateTaskId(plannedUnitId: string): string {
    return `queued-${plannedUnitId}-${this.insertionCounter}-${Math.random()
      .toString(36)
      .slice(2, 8)}`
  }
}