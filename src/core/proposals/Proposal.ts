/**
 * Proposal
 *
 * Represents a structured business proposal generated for a qualified lead.
 * The Proposal itself holds no AI-generated text; it only carries structure
 * (sections, metadata, and lifecycle status). Content population is the
 * responsibility of the AI workforce, applied through ProposalGenerator.
 */

import { ProposalSection, ProposalSectionProps } from "./ProposalSection";

export enum ProposalStatus {
  DRAFT = "DRAFT",
  REVIEW = "REVIEW",
  READY = "READY",
  SENT = "SENT",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  ARCHIVED = "ARCHIVED",
}

export interface ProposalProps {
  readonly id: string;
  readonly leadId: string;
  readonly clientId: string;
  readonly title: string;
  readonly description: string;
  readonly sections: readonly ProposalSection[];
  readonly status: ProposalStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProposalSnapshot {
  readonly id: string;
  readonly leadId: string;
  readonly clientId: string;
  readonly title: string;
  readonly description: string;
  readonly sections: readonly ProposalSectionProps[];
  readonly status: ProposalStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Defines valid forward transitions for proposal status. */
const VALID_TRANSITIONS: Readonly<Record<ProposalStatus, readonly ProposalStatus[]>> = {
  [ProposalStatus.DRAFT]: [ProposalStatus.REVIEW, ProposalStatus.ARCHIVED],
  [ProposalStatus.REVIEW]: [ProposalStatus.DRAFT, ProposalStatus.READY, ProposalStatus.ARCHIVED],
  [ProposalStatus.READY]: [ProposalStatus.SENT, ProposalStatus.REVIEW, ProposalStatus.ARCHIVED],
  [ProposalStatus.SENT]: [ProposalStatus.ACCEPTED, ProposalStatus.DECLINED, ProposalStatus.ARCHIVED],
  [ProposalStatus.ACCEPTED]: [ProposalStatus.ARCHIVED],
  [ProposalStatus.DECLINED]: [ProposalStatus.ARCHIVED],
  [ProposalStatus.ARCHIVED]: [],
};

export class Proposal {
  public readonly id: string;
  public readonly leadId: string;
  public readonly clientId: string;
  public readonly title: string;
  public readonly description: string;
  public readonly sections: readonly ProposalSection[];
  public readonly status: ProposalStatus;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: ProposalProps) {
    this.id = props.id;
    this.leadId = props.leadId;
    this.clientId = props.clientId;
    this.title = props.title;
    this.description = props.description;
    this.sections = props.sections;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Creates a new Proposal in DRAFT status.
   */
  public static create(props: {
    id: string;
    leadId: string;
    clientId: string;
    title: string;
    description: string;
    sections?: readonly ProposalSection[];
  }): Proposal {
    if (!props.id || props.id.trim().length === 0) {
      throw new Error("Proposal requires a non-empty id.");
    }
    if (!props.leadId || props.leadId.trim().length === 0) {
      throw new Error("Proposal requires a non-empty leadId.");
    }
    if (!props.clientId || props.clientId.trim().length === 0) {
      throw new Error("Proposal requires a non-empty clientId.");
    }
    if (!props.title || props.title.trim().length === 0) {
      throw new Error("Proposal requires a non-empty title.");
    }

    const now = new Date();

    return new Proposal({
      id: props.id,
      leadId: props.leadId,
      clientId: props.clientId,
      title: props.title,
      description: props.description,
      sections: props.sections ? [...props.sections] : [],
      status: ProposalStatus.DRAFT,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstructs a Proposal from a stored snapshot.
   */
  public static fromSnapshot(snapshot: ProposalSnapshot): Proposal {
    return new Proposal({
      id: snapshot.id,
      leadId: snapshot.leadId,
      clientId: snapshot.clientId,
      title: snapshot.title,
      description: snapshot.description,
      sections: snapshot.sections.map((section) => ProposalSection.create(section)),
      status: snapshot.status,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    });
  }

  /**
   * Returns a new Proposal with the given section appended.
   * Throws if a section with the same id already exists.
   */
  public withAddedSection(section: ProposalSection): Proposal {
    if (this.sections.some((existing) => existing.id === section.id)) {
      throw new Error(`Proposal already contains a section with id "${section.id}".`);
    }

    return this.cloneWith({
      sections: [...this.sections, section],
    });
  }

  /**
   * Returns a new Proposal with the given section removed.
   * Throws if the section does not exist.
   */
  public withRemovedSection(sectionId: string): Proposal {
    if (!this.sections.some((existing) => existing.id === sectionId)) {
      throw new Error(`Proposal does not contain a section with id "${sectionId}".`);
    }

    return this.cloneWith({
      sections: this.sections.filter((existing) => existing.id !== sectionId),
    });
  }

  /**
   * Returns a new Proposal transitioned to the given status.
   * Throws if the transition is not valid from the current status.
   */
  public withStatus(status: ProposalStatus): Proposal {
    const allowed = VALID_TRANSITIONS[this.status];

    if (!allowed.includes(status)) {
      throw new Error(
        `Invalid proposal status transition from "${this.status}" to "${status}".`
      );
    }

    return this.cloneWith({ status });
  }

  /**
   * Returns a new Proposal with sections sorted by their order field.
   */
  public sortedSections(): readonly ProposalSection[] {
    return [...this.sections].sort((a, b) => a.order - b.order);
  }

  /**
   * Returns a plain serialisable snapshot of this proposal.
   */
  public toSnapshot(): ProposalSnapshot {
    return {
      id: this.id,
      leadId: this.leadId,
      clientId: this.clientId,
      title: this.title,
      description: this.description,
      sections: this.sections.map((section) => section.toSnapshot()),
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private cloneWith(overrides: Partial<Omit<ProposalProps, "id" | "leadId" | "clientId" | "createdAt">>): Proposal {
    return new Proposal({
      id: this.id,
      leadId: this.leadId,
      clientId: this.clientId,
      title: overrides.title ?? this.title,
      description: overrides.description ?? this.description,
      sections: overrides.sections ?? this.sections,
      status: overrides.status ?? this.status,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }
}