
/**
 * ProjectRegistry
 *
 * Singleton in-memory registry responsible for storing and retrieving
 * Project, ProjectMilestone, ProjectTask, and ProjectTimeline instances.
 * Uses Map-based storage only. No database, no networking, no external
 * dependencies. Child entities (milestones, tasks, timeline) are keyed
 * independently but cross-referenced by projectId.
 */

import { Project } from "./Project";
import { ProjectMilestone } from "./ProjectMilestone";
import { ProjectTask } from "./ProjectTask";
import { ProjectTimeline } from "./ProjectTimeline";

export class ProjectRegistry {
  private static instance: ProjectRegistry | null = null;

  private readonly projects: Map<string, Project>;
  private readonly milestones: Map<string, ProjectMilestone>;
  private readonly tasks: Map<string, ProjectTask>;
  private readonly timelines: Map<string, ProjectTimeline>;

  private constructor() {
    this.projects = new Map<string, Project>();
    this.milestones = new Map<string, ProjectMilestone>();
    this.tasks = new Map<string, ProjectTask>();
    this.timelines = new Map<string, ProjectTimeline>();
  }

  /**
   * Returns the singleton instance of ProjectRegistry.
   */
  public static getInstance(): ProjectRegistry {
    if (ProjectRegistry.instance === null) {
      ProjectRegistry.instance = new ProjectRegistry();
    }
    return ProjectRegistry.instance;
  }

  /**
   * Resets the singleton instance. Intended for test isolation only.
   */
  public static resetInstance(): void {
    ProjectRegistry.instance = null;
  }

  // ---------------------------------------------------------------------
  // Project
  // ---------------------------------------------------------------------

  /**
   * Registers a project. Throws if a project with the same id already exists.
   */
  public register(project: Project): void {
    if (this.projects.has(project.id)) {
      throw new Error(`Project with id "${project.id}" is already registered.`);
    }
    this.projects.set(project.id, project);
  }

  /**
   * Replaces an already-registered project with an updated instance.
   * Throws if no project with that id is registered.
   */
  public update(project: Project): void {
    if (!this.projects.has(project.id)) {
      throw new Error(`Cannot update unregistered project with id "${project.id}".`);
    }
    this.projects.set(project.id, project);
  }

  /**
   * Removes a project and all of its associated milestones, tasks, and
   * timeline. Throws if no project with that id exists.
   */
  public remove(id: string): void {
    if (!this.projects.has(id)) {
      throw new Error(`Cannot remove unregistered project with id "${id}".`);
    }
    this.projects.delete(id);

    for (const milestone of this.listMilestones(id)) {
      this.milestones.delete(milestone.id);
    }
    for (const task of this.listTasks(id)) {
      this.tasks.delete(task.id);
    }
    this.timelines.delete(id);
  }

  /**
   * Finds a project by id. Throws if no project with that id exists.
   */
  public find(id: string): Project {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`No project found with id "${id}".`);
    }
    return project;
  }

  /**
   * Returns true if a project with the given id is registered.
   */
  public has(id: string): boolean {
    return this.projects.has(id);
  }

  /**
   * Lists all registered projects.
   */
  public list(): readonly Project[] {
    return Array.from(this.projects.values());
  }

  /**
   * Lists all projects belonging to a given client.
   */
  public listByClientId(clientId: string): readonly Project[] {
    return this.list().filter((project) => project.clientId === clientId);
  }

  /**
   * Returns the total number of registered projects.
   */
  public count(): number {
    return this.projects.size;
  }

  // ---------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------

  /**
   * Registers a milestone. Throws if a milestone with the same id already exists.
   */
  public registerMilestone(milestone: ProjectMilestone): void {
    if (this.milestones.has(milestone.id)) {
      throw new Error(`Milestone with id "${milestone.id}" is already registered.`);
    }
    this.milestones.set(milestone.id, milestone);
  }

  /**
   * Replaces an already-registered milestone with an updated instance.
   */
  public updateMilestone(milestone: ProjectMilestone): void {
    if (!this.milestones.has(milestone.id)) {
      throw new Error(`Cannot update unregistered milestone with id "${milestone.id}".`);
    }
    this.milestones.set(milestone.id, milestone);
  }

  /**
   * Finds a milestone by id. Throws if no milestone with that id exists.
   */
  public findMilestone(id: string): ProjectMilestone {
    const milestone = this.milestones.get(id);
    if (!milestone) {
      throw new Error(`No milestone found with id "${id}".`);
    }
    return milestone;
  }

  /**
   * Lists all milestones belonging to a given project.
   */
  public listMilestones(projectId: string): readonly ProjectMilestone[] {
    return Array.from(this.milestones.values()).filter(
      (milestone) => milestone.projectId === projectId
    );
  }

  // ---------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------

  /**
   * Registers a task. Throws if a task with the same id already exists.
   */
  public registerTask(task: ProjectTask): void {
    if (this.tasks.has(task.id)) {
      throw new Error(`Task with id "${task.id}" is already registered.`);
    }
    this.tasks.set(task.id, task);
  }

  /**
   * Replaces an already-registered task with an updated instance.
   */
  public updateTask(task: ProjectTask): void {
    if (!this.tasks.has(task.id)) {
      throw new Error(`Cannot update unregistered task with id "${task.id}".`);
    }
    this.tasks.set(task.id, task);
  }

  /**
   * Finds a task by id. Throws if no task with that id exists.
   */
  public findTask(id: string): ProjectTask {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`No task found with id "${id}".`);
    }
    return task;
  }

  /**
   * Lists all tasks belonging to a given project.
   */
  public listTasks(projectId: string): readonly ProjectTask[] {
    return Array.from(this.tasks.values()).filter((task) => task.projectId === projectId);
  }

  // ---------------------------------------------------------------------
  // Timeline
  // ---------------------------------------------------------------------

  /**
   * Registers a timeline for a project. Throws if one is already registered
   * for that project.
   */
  public registerTimeline(timeline: ProjectTimeline): void {
    if (this.timelines.has(timeline.projectId)) {
      throw new Error(`Timeline already registered for project with id "${timeline.projectId}".`);
    }
    this.timelines.set(timeline.projectId, timeline);
  }

  /**
   * Replaces the timeline for a project with an updated instance.
   */
  public updateTimeline(timeline: ProjectTimeline): void {
    if (!this.timelines.has(timeline.projectId)) {
      throw new Error(`Cannot update unregistered timeline for project with id "${timeline.projectId}".`);
    }
    this.timelines.set(timeline.projectId, timeline);
  }

  /**
   * Finds the timeline for a given project. Throws if none is registered.
   */
  public findTimeline(projectId: string): ProjectTimeline {
    const timeline = this.timelines.get(projectId);
    if (!timeline) {
      throw new Error(`No timeline found for project with id "${projectId}".`);
    }
    return timeline;
  }
}