/**
 * Opportunity.ts
 *
 * Location: src/core/crm/Opportunity.ts
 *
 * Opportunity represents a quantified, in-progress sales pursuit tied
 * to a Lead — how much it's worth, how likely it is to close, and
 * when. This file contains no logic — it is a pure data shape
 * managed by CRM.
 */

/**
 * The stage a sales Opportunity currently occupies.
 */
export enum OpportunityStage {
  QUALIFICATION = 'QUALIFICATION',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
}

/**
 * A single sales opportunity, tied to exactly one Lead.
 */
export interface Opportunity {
  readonly id: string
  readonly leadId: string
  readonly estimatedValue: number
  readonly probability: number
  readonly stage: OpportunityStage
  readonly expectedClose: Date
}