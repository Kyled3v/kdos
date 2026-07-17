/**
 * ProposalSection
 *
 * Represents a single structural section within a Proposal.
 * Sections are immutable value objects. Any mutation produces a new
 * ProposalSection instance rather than modifying state in place.
 */

export interface ProposalSectionProps {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly order: number;
}

export class ProposalSection {
  public readonly id: string;
  public readonly title: string;
  public readonly content: string;
  public readonly order: number;

  private constructor(props: ProposalSectionProps) {
    this.id = props.id;
    this.title = props.title;
    this.content = props.content;
    this.order = props.order;
  }

  /**
   * Creates a new ProposalSection instance.
   * Throws if required fields are invalid.
   */
  public static create(props: ProposalSectionProps): ProposalSection {
    if (!props.id || props.id.trim().length === 0) {
      throw new Error("ProposalSection requires a non-empty id.");
    }
    if (!props.title || props.title.trim().length === 0) {
      throw new Error("ProposalSection requires a non-empty title.");
    }
    if (props.order < 0) {
      throw new Error("ProposalSection order must be zero or greater.");
    }

    return new ProposalSection({
      id: props.id,
      title: props.title,
      content: props.content,
      order: props.order,
    });
  }

  /**
   * Returns a new ProposalSection with updated content, preserving identity and order.
   */
  public withContent(content: string): ProposalSection {
    return ProposalSection.create({
      id: this.id,
      title: this.title,
      content,
      order: this.order,
    });
  }

  /**
   * Returns a new ProposalSection with an updated order.
   */
  public withOrder(order: number): ProposalSection {
    return ProposalSection.create({
      id: this.id,
      title: this.title,
      content: this.content,
      order,
    });
  }

  /**
   * Returns a plain serialisable snapshot of this section.
   */
  public toSnapshot(): ProposalSectionProps {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      order: this.order,
    };
  }
}