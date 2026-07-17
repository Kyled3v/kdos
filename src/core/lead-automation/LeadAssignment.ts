/**
 * LeadAssignment.ts
 *
 * Location: src/core/lead-automation/LeadAssignment.ts
 *
 * LeadAssignment records which employee role and employee a lead has
 * been routed to. This file contains no logic — it is a pure data
 * shape produced by LeadAutomationEngine.
 *
 * NOTE: `leadId` is included in addition to the fields explicitly
 * listed in the spec (employeeRole, employeeId, assignedAt), since an
 * assignment record is meaningless without knowing which lead it
 * belongs to and LeadAutomationEngine needs it to key its storage. No
 * other field has been added.
 */

/**
 * A single lead-to-employee routing decision.
 */
export interface LeadAssignment {
  readonly leadId: string
  readonly employeeRole: string
  readonly employeeId: string | null
  readonly assignedAt: Date
}