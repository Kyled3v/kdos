/**
 * Lead.ts
 *
 * Location: src/core/crm/Lead.ts
 *
 * Lead is the earliest stage in the KDOS CRM pipeline: someone who
 * has not yet become a paying Client. This file contains no logic —
 * it is a pure data shape managed by CRM.
 */

/**
 * The stage a Lead currently occupies in the sales pipeline.
 */
export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  NEGOTIATION = 'NEGOTIATION',
  WON = 'WON',
  LOST = 'LOST',
}

/**
 * Where a Lead originated from. Kept as a plain string rather than an
 * enum since acquisition channels are business-configurable and will
 * grow without KDOS needing to change.
 */
export type LeadSource = string

/**
 * A single prospective client, tracked from first contact through to
 * conversion (or loss).
 */
export interface Lead {
  readonly id: string
  readonly firstName: string
  readonly lastName: string
  readonly company: string
  readonly email: string
  readonly phone: string
  readonly industry: string
  readonly website: string | null
  readonly status: LeadStatus
  readonly source: LeadSource
  readonly assignedEmployee: string | null
  readonly createdAt: Date
}