/**
 * ProjectManager
 *
 * Singleton service responsible for the lifecycle operations of Projects
 * and their associated milestones, tasks, and timeline. Delegates storage
 * entirely to ProjectRegistry. Every mutating operation appends a
 * corresponding event to the project's ProjectTimeline, keeping the audit
 * trail authoritative and automatic.
 */

import { Project, ProjectPriority, ProjectStatus } from "./Project";
import { ProjectMilestone, ProjectMilestoneStatus } from "./ProjectMilestone";
import { ProjectTask, ProjectTaskPriority, ProjectTaskStatus } from "./ProjectTask";
import { ProjectTimeline, ProjectTimelineEventType } from "./ProjectTimeline";
import { ProjectRegistry } from "./ProjectRegistry";

export interface CreateProjectInput {
  readonly id: string;
  readonly clientId: string;
  readonly quotationId: string;
  readonly projectName: string;
  readonly description: string;
  readonly priority: ProjectPriority;
  readonly startDate: Date;
  readonly targetCompletion: Date;
  readonly timelineId: string;
}

export interface AddMilestoneInput {
  readonly projectId: string;
  readonly milestoneId: string;
  readonly title: string;
  readonly description: string;
  readonly dueDate: Date;
}

export interface AddTaskInput {
  readonly projectId: string;
  readonly taskId: string;
  readonly assignedRole: string;
  readonly title: string;
  readonly description: string;
  readonly priority: ProjectTaskPriority;
  readonly estimatedHours: number;
}

export class ProjectManager {
  private static instance: ProjectManager | null = null;

  private readonly registry: ProjectRegistry;

  private constructor(registry: ProjectRegistry) {
    this.registry = registry;
  }

  /**
   * Returns the singleton instance of ProjectManager.
   * Accepts an optional registry override for dependency injection in tests.
   */
  public static getInstance(registry?: ProjectRegistry): ProjectManager {
    if (ProjectManager.instance === null) {
      ProjectManager.instance = new ProjectManager(registry ?? ProjectRegistry.getInstance());
    }
    return ProjectManager.instance;
  }

  /**
   * Resets the singleton instance. Intended for test isolation only.
   */
  public static resetInstance(): void {
    ProjectManager.instance = null;
  }

  /**
   * Creates a new PLANNING project along with its empty timeline, and
   * records a PROJECT_CREATED event.
   */
  public createProject(input: CreateProjectInput): Project {
    const project = Project.create({
      id: input.id,
      clientId: input.clientId,
      quotationId: input.quotationId,
      projectName: input.projectName,
      description: input.description,
      priority: input.priority,
      startDate: input.startDate,
      targetCompletion: input.targetCompletion,
    });

    this.registry.register(project);

    const timeline = ProjectTimeline.create({
      id: input.timelineId,
      projectId: project.id,
    }).withEvent({
      type: ProjectTimelineEventType.PROJECT_CREATED,
      description: `Project "${project.projectName}" created.`,
      relatedEntityId: project.id,
    });

    this.registry.registerTimeline(timeline);

    return project;
  }

  /**
   * Adds a milestone to a project and records a MILESTONE_ADDED event.
   */
  public addMilestone(input: AddMilestoneInput): ProjectMilestone {
    this.registry.find(input.projectId);

    const milestone = ProjectMilestone.create({
      id: input.milestoneId,
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
    });

    this.registry.registerMilestone(milestone);
    this.appendTimelineEvent(input.projectId, {
      type: ProjectTimelineEventType.MILESTONE_ADDED,
      description: `Milestone "${milestone.title}" added.`,
      relatedEntityId: milestone.id,
    });

    return milestone;
  }

  /**
   * Adds a task to a project and records a TASK_ADDED event.
   */
  public addTask(input: AddTaskInput): ProjectTask {
    this.registry.find(input.projectId);

    const task = ProjectTask.create({
      id: input.taskId,
      projectId: input.projectId,
      assignedRole: input.assignedRole,
      title: input.title,
      description: input.description,
      priority: input.priority,
      estimatedHours: input.estimatedHours,
    });

    this.registry.registerTask(task);
    this.appendTimelineEvent(input.projectId, {
      type: ProjectTimelineEventType.TASK_ADDED,
      description: `Task "${task.title}" added, assigned to role "${task.assignedRole}".`,
      relatedEntityId: task.id,
    });

    return task;
  }

  /**
   * Transitions a task through ASSIGNED/IN_PROGRESS as needed and marks it
   * COMPLETED, recording a TASK_COMPLETED event. Throws if the task's
   * current status cannot legally reach COMPLETED.
   */
  public completeTask(taskId: string): ProjectTask {
    const existing = this.registry.findTask(taskId);
    const completed = existing.withStatus(ProjectTaskStatus.COMPLETED);
    this.registry.updateTask(completed);

    this.appendTimelineEvent(completed.projectId, {
      type: ProjectTimelineEventType.TASK_COMPLETED,
      description: `Task "${completed.title}" completed.`,
      relatedEntityId: completed.id,
    });

    return completed;
  }

  /**
   * Marks a milestone COMPLETED and records a MILESTONE_COMPLETED event.
   * Throws if the milestone's current status cannot legally reach COMPLETED.
   */
  public completeMilestone(milestoneId: string): ProjectMilestone {
    const existing = this.registry.findMilestone(milestoneId);

    const inProgress =
      existing.status === ProjectMilestoneStatus.PENDING
        ? existing.withStatus(ProjectMilestoneStatus.IN_PROGRESS)
        : existing;

    const completed = inProgress.withStatus(ProjectMilestoneStatus.COMPLETED);
    this.registry.updateMilestone(completed);

    this.appendTimelineEvent(completed.projectId, {
      type: ProjectTimelineEventType.MILESTONE_COMPLETED,
      description: `Milestone "${completed.title}" completed.`,
      relatedEntityId: completed.id,
    });

    return completed;
  }

  /**
   * Transitions a project to COMPLETED status and records a PROJECT_CLOSED event.
   */
  public closeProject(projectId: string): Project {
    const existing = this.registry.find(projectId);
    const closed = existing.withStatus(ProjectStatus.COMPLETED);
    this.registry.update(closed);

    this.appendTimelineEvent(projectId, {
      type: ProjectTimelineEventType.PROJECT_CLOSED,
      description: `Project "${closed.projectName}" marked as completed.`,
      relatedEntityId: closed.id,
    });

    return closed;
  }

  /**
   * Transitions a project to CANCELLED status and records a PROJECT_CANCELLED event.
   */
  public cancelProject(projectId: string): Project {
    const existing = this.registry.find(projectId);
    const cancelled = existing.withStatus(ProjectStatus.CANCELLED);
    this.registry.update(cancelled);

    this.appendTimelineEvent(projectId, {
      type: ProjectTimelineEventType.PROJECT_CANCELLED,
      description: `Project "${cancelled.projectName}" cancelled.`,
      relatedEntityId: cancelled.id,
    });

    return cancelled;
  }

  /**
   * Retrieves a project along with its milestones, tasks, and timeline.
   */
  public getProject(projectId: string): {
    readonly project: Project;
    readonly milestones: readonly ProjectMilestone[];
    readonly tasks: readonly ProjectTask[];
    readonly timeline: ProjectTimeline;
  } {
    const project = this.registry.find(projectId);
    const milestones = this.registry.listMilestones(projectId);
    const tasks = this.registry.listTasks(projectId);
    const timeline = this.registry.findTimeline(projectId);

    return { project, milestones, tasks, timeline };
  }

  private appendTimelineEvent(
    projectId: string,
    event: { type: ProjectTimelineEventType; description: string; relatedEntityId?: string }
  ): void {
    const timeline = this.registry.findTimeline(projectId);
    const updated = timeline.withEvent(event);
    this.registry.updateTimeline(updated);
  }
}