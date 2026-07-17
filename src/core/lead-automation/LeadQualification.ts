/**
 * LeadQualification.ts
 *
 * Location: src/core/lead-automation/LeadQualification.ts
 *
 * LeadQualification is the deterministic, rule-based assessment
 * LeadAutomationEngine produces for a lead: a score and a set of
 * derived signals used to drive assignment, follow-up, and proposal
 * decisions. This file contains no logic — it is a pure data shape.
 */

/**
 * A coarse estimate of a lead's budget capacity.
 */
export enum BudgetRange {
  UNKNOWN = 'UNKNOWN',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  ENTERPRISE = 'ENTERPRISE',
}

/**
 * How urgently a lead appears to need a resolution.
 */
export enum Urgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  IMMEDIATE = 'IMMEDIATE',
}

/**
 * The priority recommended for handling this lead going forward.
 */
export enum RecommendedPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * The result of qualifying a single lead.
 */
export interface LeadQualification {
  readonly score: number
  readonly industry: string
  readonly budgetRange: BudgetRange
  readonly urgency: Urgency
  readonly recommendedPriority: RecommendedPriority
}