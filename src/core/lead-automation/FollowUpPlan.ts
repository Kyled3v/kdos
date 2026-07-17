/**
 * FollowUpPlan.ts
 *
 * Location: src/core/lead-automation/FollowUpPlan.ts
 *
 * FollowUpPlan describes the cadence of follow-up steps
 * LeadAutomationEngine intends to run for a lead. It schedules and
 * tracks this cadence only — it never sends anything itself; actual
 * delivery (email, call, etc.) is the responsibility of a subsystem
 * outside this engine.
 *
 * NOTE: `leadId` is included in addition to the fields explicitly
 * listed in the spec (steps, delayHours, maximumAttempts,
 * escalationRole), since a follow-up plan is meaningless without
 * knowing which lead it belongs to and LeadAutomationEngine needs it
 * to key its storage. No other field has been added.
 */

/**
 * The channel a single follow-up step is intended to use. Describes
 * intent only — this engine never actually sends anything.
 */
export type FollowUpChannel = 'EMAIL' | 'CALL' | 'SMS' | 'OTHER'

/**
 * A single step within a FollowUpPlan's cadence.
 */
export interface FollowUpStep {
  readonly order: number
  readonly channel: FollowUpChannel
  readonly description: string
}

/**
 * The scheduled follow-up cadence for a single lead.
 */
export interface FollowUpPlan {
  readonly leadId: string
  readonly steps: FollowUpStep[]
  readonly delayHours: number
  readonly maximumAttempts: number
  readonly escalationRole: string
}