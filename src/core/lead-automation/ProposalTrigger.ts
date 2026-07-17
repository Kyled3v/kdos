/**
 * ProposalTrigger.ts
 *
 * Location: src/core/lead-automation/ProposalTrigger.ts
 *
 * ProposalTrigger records LeadAutomationEngine's decision about
 * whether a lead is ready for a proposal, and which template it
 * should use. It contains no AI-generated content — `template` is an
 * identifier for a template maintained elsewhere, not generated text.
 * This file contains no logic — it is a pure data shape.
 */

/**
 * The recorded decision for whether, and how, a lead should proceed
 * toward a proposal.
 */
export interface ProposalTrigger {
  readonly leadId: string
  readonly qualified: boolean
  readonly proposalRequired: boolean
  readonly template: string
}