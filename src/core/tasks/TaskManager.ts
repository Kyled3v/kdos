/**
 * TaskManager.ts
 *
 * Location: src/core/tasks/TaskManager.ts
 *
 * TaskManager is the central work management engine of KDOS. Every
 * task belongs to a Project, and optionally to a Client, an
 * Employee, or (in the future) an AI Worker via `assignedTo`.
 *
 * TaskManager is completely AI-independent: it contains no reasoning,
 * no dispatch, and no knowledge of how a task actually gets done — it
 * only tracks task records and their lifecycle state, in memory.
 */

/**
 * The lifecycle status of a task.
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  BLOCKED = 'BLOCKED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * The relative urgency of a task.
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * A single unit of work belonging to a project.
 */
export interface Task {
  readonly id: string
  readonly projectId: string
  readonly clientId: string | null
  readonly assignedTo: string | null
  readonly title: string
  readonly description: string
  readonly status: TaskStatus
  readonly priority: TaskPriority
  readonly estimatedHours: number
  readonly actualHours: number
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly completedAt: Date | null
}

/**
 * The fields required to create a new Task. Status defaults to TODO
 * and priority defaults to MEDIUM when not supplied; timestamps and
 * id are always assigned by TaskManager itself.
 */
export interface CreateTaskInput {
  readonly projectId: string
  readonly title: string
  readonly description: string
  readonly clientId?: string | null
  readonly assignedTo?: string | null
  readonly status?: TaskStatus
  readonly priority?: TaskPriority
  readonly estimatedHours?: number
}

/**
 * The fields that may be updated on an existing Task. All fields are
 * optional — only supplied fields are changed. projectId is
 * intentionally excluded: reassigning a task to a different project
 * is a distinct operation from an ordinary update and is out of
 * scope for this class.
 */
export interface UpdateTaskInput {
  readonly clientId?: string | null
  readonly assignedTo?: string | null
  readonly title?: string
  readonly description?: string
  readonly status?: TaskStatus
  readonly priority?: TaskPriority
  readonly estimatedHours?: number
  readonly actualHours?: number
}

/**
 * Generates unique task identifiers. Extracted as an injectable
 * dependency so id generation strategy (uuid, nanoid, sequential,
 * etc.) can be swapped without changing TaskManager itself.
 */
export interface IdGenerator {
  generate(prefix: string): string
}

/**
 * Default IdGenerator implementation, used when no IdGenerator is
 * injected.
 */
class DefaultIdGenerator implements IdGenerator {
  public generate(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

/**
 * TaskManager
 *
 * Single responsibility: own the full lifecycle of Task records —
 * creation, update, assignment, status transitions, archival,
 * deletion, retrieval, and search — entirely in memory.
 *
 * This class:
 *   - Stores tasks in a Map<string, Task>, keyed by task id.
 *   - Uses no database or filesystem; all state lives in memory for
 *     the lifetime of this instance.
 *   - Performs no AI calls and contains no reasoning about how a
 *     task should be completed.
 *   - Performs no authentication or authorization — callers are
 *     assumed to already be authorized by the time they reach this
 *     class.
 *   - Never mutates a returned Task in place; every change produces
 *     a new, frozen record.
 *   - Is dependency-injection ready: id generation is supplied via
 *     the constructor.
 */
export class TaskManager {
  /**
   * Internal in-memory task store, keyed by task id.
   */
  private readonly tasks = new Map<string, Task>()

  private readonly idGenerator: IdGenerator

  public constructor(idGenerator: IdGenerator = new DefaultIdGenerator()) {
    this.idGenerator = idGenerator
  }

  /**
   * Creates a new Task record.
   *
   * @param input - The fields describing the new task.
   * @returns The newly created Task.
   */
  public createTask(input: CreateTaskInput): Task {
    const now = new Date()

    const task: Task = Object.freeze({
      id: this.idGenerator.generate('task'),
      projectId: input.projectId,
      clientId: input.clientId ?? null,
      assignedTo: input.assignedTo ?? null,
      title: input.title,
      description: input.description,
      status: input.status ?? TaskStatus.TODO,
      priority: input.priority ?? TaskPriority.MEDIUM,
      estimatedHours: input.estimatedHours ?? 0,
      actualHours: 0,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    })

    this.tasks.set(task.id, task)
    return task
  }

  /**
   * Updates an existing Task with the supplied fields. Fields not
   * present in `input` are left unchanged.
   *
   * @param taskId - The id of the Task to update.
   * @param input - The fields to change.
   * @returns The updated Task.
   * @throws Error if no Task exists for the given id.
   */
  public updateTask(taskId: string, input: UpdateTaskInput): Task {
    const task = this.requireTask(taskId)

    const updated: Task = Object.freeze({
      ...task,
      ...input,
      updatedAt: new Date(),
    })

    this.tasks.set(taskId, updated)
    return updated
  }

  /**
   * Assigns a task to an employee, AI worker, or other actor id.
   * Pass null to unassign the task.
   *
   * @param taskId - The id of the Task to assign.
   * @param assigneeId - The id of the actor to assign the task to,
   *        or null to clear the assignment.
   * @returns The updated Task.
   * @throws Error if no Task exists for the given id.
   */
  public assignTask(taskId: string, assigneeId: string | null): Task {
    return this.updateTask(taskId, { assignedTo: assigneeId })
  }

  /**
   * Transitions a task into IN_PROGRESS status, marking work as
   * underway.
   *
   * @param taskId - The id of the Task to start.
   * @returns The updated Task.
   * @throws Error if no Task exists for the given id.
   */
  public startTask(taskId: string): Task {
    return this.updateTask(taskId, { status: TaskStatus.IN_PROGRESS })
  }

  /**
   * Transitions a task into COMPLETED status and records its
   * completion time. Optionally records the actual hours spent.
   *
   * @param taskId - The id of the Task to complete.
   * @param actualHours - The actual hours spent on the task, if
   *        known. When omitted, the task's existing actualHours is
   *        preserved.
   * @returns The updated Task.
   * @throws Error if no Task exists for the given id.
   */
  public completeTask(taskId: string, actualHours?: number): Task {
    const task = this.requireTask(taskId)

    const updated: Task = Object.freeze({
      ...task,
      status: TaskStatus.COMPLETED,
      actualHours: actualHours ?? task.actualHours,
      completedAt: new Date(),
      updatedAt: new Date(),
    })

    this.tasks.set(taskId, updated)
    return updated
  }

  /**
   * Archives a Task by setting its status to ARCHIVED. Idempotent —
   * archiving an already-archived task simply refreshes its
   * updatedAt timestamp.
   *
   * @param taskId - The id of the Task to archive.
   * @returns The archived Task.
   * @throws Error if no Task exists for the given id.
   */
  public archiveTask(taskId: string): Task {
    return this.updateTask(taskId, { status: TaskStatus.ARCHIVED })
  }

  /**
   * Permanently removes a Task record from the store. Unlike
   * archiveTask, this is not reversible — the record is gone.
   *
   * @param taskId - The id of the Task to delete.
   * @throws Error if no Task exists for the given id.
   */
  public deleteTask(taskId: string): void {
    this.requireTask(taskId)
    this.tasks.delete(taskId)
  }

  /**
   * Retrieves a single Task by id.
   *
   * @param taskId - The id of the Task to retrieve.
   * @returns The Task, or undefined if no Task exists for the given
   *          id.
   */
  public getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * Retrieves every stored Task, optionally filtered by status
   * and/or priority.
   *
   * @param filter - Optional filters to narrow the result set.
   * @param filter.status - If supplied, only Tasks with this status
   *        are returned.
   * @param filter.priority - If supplied, only Tasks with this
   *        priority are returned.
   * @returns The matching Tasks.
   */
  public getTasks(filter?: { status?: TaskStatus; priority?: TaskPriority }): Task[] {
    let results = [...this.tasks.values()]

    if (filter?.status) {
      results = results.filter((task) => task.status === filter.status)
    }

    if (filter?.priority) {
      results = results.filter((task) => task.priority === filter.priority)
    }

    return results
  }

  /**
   * Retrieves every Task belonging to a given project.
   *
   * @param projectId - The id of the owning project.
   * @returns The project's Tasks. Empty if the project has none.
   */
  public getProjectTasks(projectId: string): Task[] {
    return [...this.tasks.values()].filter((task) => task.projectId === projectId)
  }

  /**
   * Retrieves every Task assigned to a given employee (or other
   * assignee id, including a future AI worker).
   *
   * @param employeeId - The id of the assignee.
   * @returns The assignee's Tasks. Empty if none are assigned.
   */
  public getEmployeeTasks(employeeId: string): Task[] {
    return [...this.tasks.values()].filter((task) => task.assignedTo === employeeId)
  }

  /**
   * Searches Tasks by a free-text query, matched case-insensitively
   * against title and description.
   *
   * @param query - The search text.
   * @returns Tasks with at least one matching field. Returns every
   *          Task if the query is empty or whitespace-only.
   */
  public searchTasks(query: string): Task[] {
    const normalized = query.trim().toLowerCase()

    if (normalized.length === 0) {
      return [...this.tasks.values()]
    }

    return [...this.tasks.values()].filter((task) =>
      [task.title, task.description].join(' ').toLowerCase().includes(normalized)
    )
  }

  /**
   * Retrieves a Task by id or throws if none exists, so calling
   * methods can operate on a guaranteed-defined Task.
   */
  private requireTask(taskId: string): Task {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`TaskManager: no task found for id "${taskId}".`)
    }
    return task
  }
}