/**
 * ProjectTimeline
 *
 * Represents the chronological history of significant events for a Project.
 * Immutable value object; append operations return new instances. Events
 * are never removed or reordered once recorded, preserving an accurate
 * audit trail.
 */

export enum ProjectTimelineEventType {
  PROJECT_CREATED = "PROJECT_CREATED",
  STATUS_CHANGED = "STATUS_CHANGED",
  MILESTONE_ADDED = "MILESTONE_ADDED",
  MILESTONE_COMPLETED = "MILESTONE_COMPLETED",
  TASK_ADDED = "TASK_ADDED",
  TASK_COMPLETED = "TASK_COMPLETED",
  PROJECT_CLOSED = "PROJECT_CLOSED",
  PROJECT_CANCELLED = "PROJECT_CANCELLED",
}

export interface ProjectTimelineEvent {
  readonly type: ProjectTimelineEventType;
  readonly description: string;
  readonly occurredAt: Date;
  readonly relatedEntityId: string | null;
}

export interface ProjectTimelineProps {
  readonly id: string;
  readonly projectId: string;
  readonly events: readonly ProjectTimelineEvent[];
}

export class ProjectTimeline {
  public readonly id: string;
  public readonly projectId: string;
  public readonly events: readonly ProjectTimelineEvent[];

  private constructor(props: ProjectTimelineProps) {
    this.id = props.id;
    this.projectId = props.projectId;
    this.events = props.events;
  }

  /**
   * Creates a new, empty ProjectTimeline for a project.
   */
  public static create(props: { id: string; projectId: string }): ProjectTimeline {
    if (!props.id || props.id.trim().length === 0) {
      throw new Error("ProjectTimeline requires a non-empty id.");
    }
    if (!props.projectId || props.projectId.trim().length === 0) {
      throw new Error("ProjectTimeline requires a non-empty projectId.");
    }

    return new ProjectTimeline({
      id: props.id,
      projectId: props.projectId,
      events: [],
    });
  }

  /**
   * Reconstructs a ProjectTimeline from a stored snapshot.
   */
  public static fromSnapshot(snapshot: ProjectTimelineProps): ProjectTimeline {
    return new ProjectTimeline(snapshot);
  }

  /**
   * Returns a new ProjectTimeline with the given event appended.
   */
  public withEvent(event: {
    type: ProjectTimelineEventType;
    description: string;
    relatedEntityId?: string;
  }): ProjectTimeline {
    if (!event.description || event.description.trim().length === 0) {
      throw new Error("ProjectTimelineEvent requires a non-empty description.");
    }

    const newEvent: ProjectTimelineEvent = {
      type: event.type,
      description: event.description,
      occurredAt: new Date(),
      relatedEntityId: event.relatedEntityId ?? null,
    };

    return new ProjectTimeline({
      id: this.id,
      projectId: this.projectId,
      events: [...this.events, newEvent],
    });
  }

  /**
   * Returns events filtered by type, in chronological order.
   */
  public eventsOfType(type: ProjectTimelineEventType): readonly ProjectTimelineEvent[] {
    return this.events.filter((event) => event.type === type);
  }

  /**
   * Returns the most recent event, or null if the timeline has no events.
   */
  public latestEvent(): ProjectTimelineEvent | null {
    return this.events.length === 0 ? null : this.events[this.events.length - 1];
  }

  /**
   * Returns a plain serialisable snapshot of this timeline.
   */
  public toSnapshot(): ProjectTimelineProps {
    return {
      id: this.id,
      projectId: this.projectId,
      events: this.events,
    };
  }
}