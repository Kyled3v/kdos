/**
 * Interaction.ts
 *
 * Location: src/core/crm/Interaction.ts
 *
 * Interaction records a single touchpoint between an employee and a
 * Lead — a call, an email, a meeting, or a note. This file contains
 * no logic — it is a pure data shape managed by CRM.
 */

/**
 * The kind of touchpoint an Interaction records.
 */
export enum InteractionType {
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  NOTE = 'NOTE',
  DEMO = 'DEMO',
  OTHER = 'OTHER',
}

/**
 * A single logged touchpoint with a Lead.
 */
export interface Interaction {
  readonly id: string
  readonly leadId: string
  readonly employeeId: string
  readonly type: InteractionType
  readonly summary: string
  readonly createdAt: Date
}