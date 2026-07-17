/**
 * ProposalTemplate
 *
 * Represents a reusable, industry-specific blueprint for generating
 * proposals. Templates carry a fixed set of section blueprints that
 * ProposalGenerator uses to instantiate new Proposal sections.
 */

export interface ProposalSectionBlueprint {
  readonly title: string;
  readonly defaultContent: string;
  readonly order: number;
}

export interface ProposalTemplateProps {
  readonly id: string;
  readonly name: string;
  readonly industry: string;
  readonly sections: readonly ProposalSectionBlueprint[];
}

export class ProposalTemplate {
  public readonly id: string;
  public readonly name: string;
  public readonly industry: string;
  public readonly sections: readonly ProposalSectionBlueprint[];

  private constructor(props: ProposalTemplateProps) {
    this.id = props.id;
    this.name = props.name;
    this.industry = props.industry;
    this.sections = props.sections;
  }

  /**
   * Creates a new ProposalTemplate.
   * Throws if required fields are invalid or blueprint orders collide.
   */
  public static create(props: ProposalTemplateProps): ProposalTemplate {
    if (!props.id || props.id.trim().length === 0) {
      throw new Error("ProposalTemplate requires a non-empty id.");
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new Error("ProposalTemplate requires a non-empty name.");
    }
    if (!props.industry || props.industry.trim().length === 0) {
      throw new Error("ProposalTemplate requires a non-empty industry.");
    }
    if (props.sections.length === 0) {
      throw new Error("ProposalTemplate requires at least one section blueprint.");
    }

    const orders = props.sections.map((section) => section.order);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      throw new Error("ProposalTemplate section blueprints must have unique order values.");
    }

    return new ProposalTemplate({
      id: props.id,
      name: props.name,
      industry: props.industry,
      sections: [...props.sections].sort((a, b) => a.order - b.order),
    });
  }

  /**
   * Returns the section blueprints in defined order.
   */
  public orderedSections(): readonly ProposalSectionBlueprint[] {
    return this.sections;
  }

  /**
   * Returns a plain serialisable snapshot of this template.
   */
  public toSnapshot(): ProposalTemplateProps {
    return {
      id: this.id,
      name: this.name,
      industry: this.industry,
      sections: this.sections,
    };
  }
}