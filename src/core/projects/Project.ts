
/**
 * Project
 *
 * Represents an active engagement delivered by the KyleDev AI workforce,
 * created after a Quotation has been accepted. A Project owns no milestones
 * or tasks directly — those are separate aggregates linked by projectId and
 * coordinated through ProjectManager — but tracks its own lifecycle status,
 * priority, and scheduling.
 */

export enum ProjectStatus {
  PLANNING = "PLANNING",
  ACTIVE = "ACTIVE",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum ProjectPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface ProjectProps {
  readonly id: string;
  readonly clientId: string;
  readonly quotationId: string;
  readonly projectName: string;
  readonly description: string;
  readonly status: ProjectStatus;
  readonly priority: ProjectPriority;
  readonly startDate: Date;
  readonly targetCompletion: Date;
  readonly createdAt: Date;
}

const VALID_TRANSITIONS: Readonly<Record<ProjectStatus, readonly ProjectStatus[]>> = {
  [ProjectStatus.PLANNING]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
  [ProjectStatus.ACTIVE]: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  [ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
  [ProjectStatus.COMPLETED]: [],
  [ProjectStatus.CANCELLED]: [],
};

export class Project {
  public readonly id: string;
  public readonly clientId: string;
  public readonly quotationId: string;
  public readonly projectName: string;
  public readonly description: string;
  public readonly status: ProjectStatus;
  public readonly priority: ProjectPriority;
  public readonly startDate: Date;
  public readonly targetCompletion: Date;
  public readonly createdAt: Date;

  private constructor(props: ProjectProps) {
    this.id = props.id;
    this.clientId = props.clientId;
    this.quotationId = props.quotationId;
    this.projectName = props.projectName;
    this.description = props.description;
    this.status = props.status;
    this.priority = props.priority;
    this.startDate = props.startDate;
    this.targetCompletion = props.targetCompletion;
    this.createdAt = props.createdAt;
  }

  /**
   * Creates a new Project in PLANNING status.
   */
  public static create(props: {
    id: string;
    clientId: string;
    quotationId: string;
    projectName: string;
    description: string;
    priority: ProjectPriority;
    startDate: Date;
    targetCompletion: Date;
  }): Project {
    if (!props.id || props.id.trim().length === 0) {
      throw new Error("Project requires a non-empty id.");
    }
    if (!props.clientId || props.clientId.trim().length === 0) {
      throw new Error("Project requires a non-empty clientId.");
    }
    if (!props.quotationId || props.quotationId.trim().length === 0) {
      throw new Error("Project requires a non-empty quotationId.");
    }
    if (!props.projectName || props.projectName.trim().length === 0) {
      throw new Error("Project requires a non-empty projectName.");
    }
    if (props.targetCompletion.getTime() <= props.startDate.getTime()) {
      throw new Error("Project targetCompletion must be after startDate.");
    }

    return new Project({
      id: props.id,
      clientId: props.clientId,
      quotationId: props.quotationId,
      projectName: props.projectName,
      description: props.description,
      status: ProjectStatus.PLANNING,
      priority: props.priority,
      startDate: props.startDate,
      targetCompletion: props.targetCompletion,
      createdAt: new Date(),
    });
  }

  /**
   * Reconstructs a Project from a stored snapshot.
   */
  public static fromSnapshot(snapshot: ProjectProps): Project {
    return new Project(snapshot);
  }

  /**
   * Returns a new Project transitioned to the given status.
   * Throws if the transition is not valid from the current status.
   */
  public withStatus(status: ProjectStatus): Project {
    const allowed = VALID_TRANSITIONS[this.status];

    if (!allowed.includes(status)) {
      throw new Error(
        `Invalid project status transition from "${this.status}" to "${status}".`
      );
    }

    return new Project({
      id: this.id,
      clientId: this.clientId,
      quotationId: this.quotationId,
      projectName: this.projectName,
      description: this.description,
      status,
      priority: this.priority,
      startDate: this.startDate,
      targetCompletion: this.targetCompletion,
      createdAt: this.createdAt,
    });
  }

  /**
   * Returns a new Project with an updated priority.
   */
  public withPriority(priority: ProjectPriority): Project {
    return new Project({
      id: this.id,
      clientId: this.clientId,
      quotationId: this.quotationId,
      projectName: this.projectName,
      description: this.description,
      status: this.status,
      priority,
      startDate: this.startDate,
      targetCompletion: this.targetCompletion,
      createdAt: this.createdAt,
    });
  }

  /**
   * Returns a new Project with an updated target completion date.
   */
  public withTargetCompletion(targetCompletion: Date): Project {
    if (targetCompletion.getTime() <= this.startDate.getTime()) {
      throw new Error("Project targetCompletion must be after startDate.");
    }

    return new Project({
      id: this.id,
      clientId: this.clientId,
      quotationId: this.quotationId,
      projectName: this.projectName,
      description: this.description,
      status: this.status,
      priority: this.priority,
      startDate: this.startDate,
      targetCompletion,
      createdAt: this.createdAt,
    });
  }

  /**
   * Returns true if this project is in a terminal status.
   */
  public isTerminal(): boolean {
    return this.status === ProjectStatus.COMPLETED || this.status === ProjectStatus.CANCELLED;
  }

  /**
   * Returns a plain serialisable snapshot of this project.
   */
  public toSnapshot(): ProjectProps {
    return {
      id: this.id,
      clientId: this.clientId,
      quotationId: this.quotationId,
      projectName: this.projectName,
      description: this.description,
      status: this.status,
      priority: this.priority,
      startDate: this.startDate,
      targetCompletion: this.targetCompletion,
      createdAt: this.createdAt,
    };
  }
}