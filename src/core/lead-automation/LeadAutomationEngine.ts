/**
 * LeadAutomationEngine.ts
 *
 * Location: src/core/lead-automation/LeadAutomationEngine.ts
 *
 * LeadAutomationEngine coordinates a lead's journey from capture to
 * proposal without human intervention. It qualifies leads with
 * deterministic, rule-based scoring (never AI), assigns them to an
 * employee role, schedules a follow-up cadence, and decides when a
 * proposal should be triggered.
 *
 * LeadAutomationEngine does not generate AI responses, does not send
 * email or make API/network calls, and does not touch a database — it
 * only coordinates workflow state, entirely in memory.
 *
 * NOTE ON IMPORTS:
 * Lead and LeadStatus are imported from the existing CRM module
 * rather than redefined here, since this engine processes CRM leads
 * directly. Adjust the path below if the actual module location
 * differs:
 *   - Lead, LeadStatus: '../crm/Lead'
 */

import type { Lead } from '../crm/Lead'
import { LeadStatus } from '../crm/Lead'
import type { LeadQualification } from './LeadQualification'
import { BudgetRange, RecommendedPriority, Urgency } from './LeadQualification'
import type { LeadAssignment } from './LeadAssignment'
import type { FollowUpPlan, FollowUpStep } from './FollowUpPlan'
import type { ProposalTrigger } from './ProposalTrigger'

/**
 * The outcome of running processLead() end to end for a single lead.
 */
export interface LeadAutomationResult {
  readonly qualification: LeadQualification
  readonly assignment: LeadAssignment
  readonly followUpPlan: FollowUpPlan
  readonly proposalTrigger: ProposalTrigger | null
}

/**
 * Whether automation is currently permitted to run for a given lead.
 */
enum AutomationStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

/**
 * The default employee role a lead is assigned to before any
 * role-specific routing rule applies.
 */
const DEFAULT_EMPLOYEE_ROLE = 'SALES'

/**
 * The employee role escalate() routes a lead to once its follow-up
 * plan runs out of attempts, unless the plan specifies its own
 * escalationRole.
 */
const DEFAULT_ESCALATION_ROLE = 'SALES_MANAGER'

/**
 * LeadAutomationEngine
 *
 * Single responsibility: coordinate a lead's automated progression —
 * qualification, assignment, follow-up scheduling, proposal
 * triggering, and escalation — entirely in memory.
 *
 * This class:
 *   - Is a singleton — use LeadAutomationEngine.getInstance() rather
 *     than `new`.
 *   - Performs no AI calls; qualification scoring is deterministic
 *     and rule-based.
 *   - Sends no email, makes no API or network calls, and touches no
 *     database.
 *   - Stores every record in a Map, keyed by leadId.
 */
export class LeadAutomationEngine {
  private static instance: LeadAutomationEngine | null = null

  private readonly qualifications = new Map<string, LeadQualification>()
  private readonly assignments = new Map<string, LeadAssignment>()
  private readonly followUpPlans = new Map<string, FollowUpPlan>()
  private readonly proposalTriggers = new Map<string, ProposalTrigger>()
  private readonly automationStatus = new Map<string, AutomationStatus>()
  private readonly followUpAttempts = new Map<string, number>()

  /**
   * Private constructor — LeadAutomationEngine is a singleton and
   * must be created via getInstance(), never directly.
   */
  private constructor() {}

  /**
   * Retrieves the singleton LeadAutomationEngine instance, creating
   * it on first call.
   */
  public static getInstance(): LeadAutomationEngine {
    if (!LeadAutomationEngine.instance) {
      LeadAutomationEngine.instance = new LeadAutomationEngine()
    }
    return LeadAutomationEngine.instance
  }

  /**
   * Resets the singleton instance. Intended for test isolation only.
   */
  public static resetInstance(): void {
    LeadAutomationEngine.instance = null
  }

  /**
   * Runs the full automation pipeline for a lead: qualify, assign,
   * schedule follow-up, and — if warranted — trigger a proposal.
   *
   * @param lead - The Lead to process.
   * @returns Every record produced during this pass.
   */
  public processLead(lead: Lead): LeadAutomationResult {
    this.automationStatus.set(lead.id, AutomationStatus.ACTIVE)

    const qualification = this.qualifyLead(lead)
    const assignment = this.assignLead(lead, qualification)
    const followUpPlan = this.scheduleFollowUp(lead.id, qualification)

    const proposalTrigger =
      qualification.recommendedPriority === RecommendedPriority.LOW
        ? null
        : this.triggerProposal(lead.id)

    return { qualification, assignment, followUpPlan, proposalTrigger }
  }

  /**
   * Produces a deterministic, rule-based LeadQualification for a
   * lead. Contains no AI — every signal is derived from simple,
   * explainable rules over the lead's own fields.
   *
   * @param lead - The Lead to qualify.
   * @returns The computed LeadQualification.
   * @throws Error if automation has been cancelled for this lead.
   */
  public qualifyLead(lead: Lead): LeadQualification {
    this.assertActive(lead.id)

    const budgetRange = this.estimateBudgetRange(lead)
    const urgency = this.estimateUrgency(lead)
    const score = this.computeScore(lead, budgetRange, urgency)
    const recommendedPriority = this.derivePriority(score, urgency)

    const qualification: LeadQualification = Object.freeze({
      score,
      industry: lead.industry,
      budgetRange,
      urgency,
      recommendedPriority,
    })

    this.qualifications.set(lead.id, qualification)
    return qualification
  }

  /**
   * Assigns a lead to an employee role, based on its qualification's
   * recommended priority. High-priority leads route to a senior role;
   * everything else routes to the default sales role. Does not select
   * a specific employeeId — that is left null for a separate routing
   * step outside this engine to fill in.
   *
   * @param lead - The Lead to assign.
   * @param qualification - The lead's LeadQualification, used to
   *        decide routing. If omitted, an existing qualification for
   *        this lead is used if one has already been computed.
   * @returns The newly created LeadAssignment.
   * @throws Error if automation has been cancelled for this lead, or
   *         if no qualification is available.
   */
  public assignLead(lead: Lead, qualification?: LeadQualification): LeadAssignment {
    this.assertActive(lead.id)

    const resolvedQualification = qualification ?? this.qualifications.get(lead.id)
    if (!resolvedQualification) {
      throw new Error(
        `LeadAutomationEngine: cannot assign lead "${lead.id}" without a qualification.`
      )
    }

    const employeeRole =
      resolvedQualification.recommendedPriority === RecommendedPriority.CRITICAL ||
      resolvedQualification.recommendedPriority === RecommendedPriority.HIGH
        ? 'SENIOR_SALES'
        : DEFAULT_EMPLOYEE_ROLE

    const assignment: LeadAssignment = Object.freeze({
      leadId: lead.id,
      employeeRole,
      employeeId: lead.assignedEmployee,
      assignedAt: new Date(),
    })

    this.assignments.set(lead.id, assignment)
    return assignment
  }

  /**
   * Builds and stores a FollowUpPlan for a lead, based on its
   * qualification's recommended priority: higher priority leads get
   * shorter delays, more attempts, and more steps.
   *
   * @param leadId - The id of the Lead to schedule follow-up for.
   * @param qualification - The lead's LeadQualification, used to
   *        shape the cadence. If omitted, an existing qualification
   *        for this lead is used if one has already been computed.
   * @returns The newly created FollowUpPlan.
   * @throws Error if automation has been cancelled for this lead, or
   *         if no qualification is available.
   */
  public scheduleFollowUp(leadId: string, qualification?: LeadQualification): FollowUpPlan {
    this.assertActive(leadId)

    const resolvedQualification = qualification ?? this.qualifications.get(leadId)
    if (!resolvedQualification) {
      throw new Error(
        `LeadAutomationEngine: cannot schedule follow-up for lead "${leadId}" without a qualification.`
      )
    }

    const { delayHours, maximumAttempts, steps } = this.buildCadence(
      resolvedQualification.recommendedPriority
    )

    const plan: FollowUpPlan = Object.freeze({
      leadId,
      steps,
      delayHours,
      maximumAttempts,
      escalationRole: DEFAULT_ESCALATION_ROLE,
    })

    this.followUpPlans.set(leadId, plan)
    this.followUpAttempts.set(leadId, 0)
    return plan
  }

  /**
   * Records the decision that a lead is ready to move toward a
   * proposal, based on its stored LeadQualification.
   *
   * @param leadId - The id of the Lead to trigger a proposal for.
   * @returns The newly created ProposalTrigger.
   * @throws Error if automation has been cancelled for this lead, or
   *         if no qualification has been computed yet.
   */
  public triggerProposal(leadId: string): ProposalTrigger {
    this.assertActive(leadId)

    const qualification = this.qualifications.get(leadId)
    if (!qualification) {
      throw new Error(
        `LeadAutomationEngine: cannot trigger a proposal for lead "${leadId}" without a qualification.`
      )
    }

    const qualified =
      qualification.recommendedPriority !== RecommendedPriority.LOW && qualification.score >= 50

    const trigger: ProposalTrigger = Object.freeze({
      leadId,
      qualified,
      proposalRequired: qualified,
      template: this.selectTemplate(qualification),
    })

    this.proposalTriggers.set(leadId, trigger)
    return trigger
  }

  /**
   * Escalates a lead's follow-up to its plan's escalationRole. Meant
   * to be called once a lead's follow-up attempts are exhausted (or
   * on demand), incrementing the recorded attempt count.
   *
   * @param leadId - The id of the Lead to escalate.
   * @returns The employee role the lead has been escalated to.
   * @throws Error if automation has been cancelled for this lead, or
   *         if no FollowUpPlan exists for it.
   */
  public escalate(leadId: string): string {
    this.assertActive(leadId)

    const plan = this.followUpPlans.get(leadId)
    if (!plan) {
      throw new Error(`LeadAutomationEngine: no follow-up plan exists for lead "${leadId}".`)
    }

    const attempts = (this.followUpAttempts.get(leadId) ?? 0) + 1
    this.followUpAttempts.set(leadId, attempts)

    return plan.escalationRole
  }

  /**
   * Cancels all further automation for a lead. Every subsequent call
   * to qualifyLead, assignLead, scheduleFollowUp, triggerProposal, or
   * escalate for this lead will throw until processLead is called
   * again to reactivate it.
   *
   * @param leadId - The id of the Lead to cancel automation for.
   */
  public cancelAutomation(leadId: string): void {
    this.automationStatus.set(leadId, AutomationStatus.CANCELLED)
  }

  /**
   * Estimates a lead's budget range from the signals available on the
   * Lead record itself. Deterministic and rule-based — no AI.
   */
  private estimateBudgetRange(lead: Lead): BudgetRange {
    if (!lead.website) {
      return BudgetRange.UNKNOWN
    }

    const highValueIndustries = ['finance', 'healthcare', 'enterprise software', 'manufacturing']
    if (highValueIndustries.includes(lead.industry.toLowerCase())) {
      return BudgetRange.HIGH
    }

    return BudgetRange.MEDIUM
  }

  /**
   * Estimates a lead's urgency from its current pipeline status.
   * Deterministic and rule-based — no AI.
   */
  private estimateUrgency(lead: Lead): Urgency {
    switch (lead.status) {
      case LeadStatus.NEGOTIATION:
      case LeadStatus.PROPOSAL_SENT:
        return Urgency.IMMEDIATE
      case LeadStatus.QUALIFIED:
        return Urgency.HIGH
      case LeadStatus.CONTACTED:
        return Urgency.MEDIUM
      default:
        return Urgency.LOW
    }
  }

  /**
   * Computes a deterministic 0-100 score for a lead from its budget
   * range and urgency signals.
   */
  private computeScore(lead: Lead, budgetRange: BudgetRange, urgency: Urgency): number {
    let score = 0

    switch (budgetRange) {
      case BudgetRange.ENTERPRISE:
        score += 40
        break
      case BudgetRange.HIGH:
        score += 30
        break
      case BudgetRange.MEDIUM:
        score += 20
        break
      case BudgetRange.LOW:
        score += 10
        break
      default:
        score += 0
    }

    switch (urgency) {
      case Urgency.IMMEDIATE:
        score += 40
        break
      case Urgency.HIGH:
        score += 30
        break
      case Urgency.MEDIUM:
        score += 15
        break
      default:
        score += 0
    }

    if (lead.website) {
      score += 10
    }

    if (lead.assignedEmployee) {
      score += 10
    }

    return Math.min(100, score)
  }

  /**
   * Derives a recommended priority from a lead's score and urgency.
   */
  private derivePriority(score: number, urgency: Urgency): RecommendedPriority {
    if (urgency === Urgency.IMMEDIATE || score >= 80) {
      return RecommendedPriority.CRITICAL
    }
    if (score >= 60) {
      return RecommendedPriority.HIGH
    }
    if (score >= 35) {
      return RecommendedPriority.MEDIUM
    }
    return RecommendedPriority.LOW
  }

  /**
   * Builds a follow-up cadence (delay, attempts, and step list) sized
   * to a recommended priority.
   */
  private buildCadence(priority: RecommendedPriority): {
    delayHours: number
    maximumAttempts: number
    steps: FollowUpStep[]
  } {
    switch (priority) {
      case RecommendedPriority.CRITICAL:
        return {
          delayHours: 2,
          maximumAttempts: 5,
          steps: this.buildSteps(['CALL', 'EMAIL', 'CALL', 'EMAIL', 'CALL']),
        }
      case RecommendedPriority.HIGH:
        return {
          delayHours: 12,
          maximumAttempts: 4,
          steps: this.buildSteps(['EMAIL', 'CALL', 'EMAIL', 'CALL']),
        }
      case RecommendedPriority.MEDIUM:
        return {
          delayHours: 24,
          maximumAttempts: 3,
          steps: this.buildSteps(['EMAIL', 'EMAIL', 'CALL']),
        }
      default:
        return {
          delayHours: 72,
          maximumAttempts: 2,
          steps: this.buildSteps(['EMAIL', 'EMAIL']),
        }
    }
  }

  /**
   * Builds an ordered list of FollowUpSteps from a list of channels.
   */
  private buildSteps(channels: FollowUpStep['channel'][]): FollowUpStep[] {
    return channels.map((channel, index) => ({
      order: index + 1,
      channel,
      description: `Attempt ${index + 1}: follow up via ${channel.toLowerCase()}.`,
    }))
  }

  /**
   * Selects a proposal template identifier based on a lead's
   * qualification. Returns an identifier only — this engine never
   * generates proposal content itself.
   */
  private selectTemplate(qualification: LeadQualification): string {
    if (qualification.recommendedPriority === RecommendedPriority.CRITICAL) {
      return 'template-enterprise-fast-track'
    }
    if (qualification.budgetRange === BudgetRange.HIGH) {
      return 'template-standard-high-value'
    }
    return 'template-standard'
  }

  /**
   * Throws if automation has been cancelled for a given lead.
   */
  private assertActive(leadId: string): void {
    if (this.automationStatus.get(leadId) === AutomationStatus.CANCELLED) {
      throw new Error(`LeadAutomationEngine: automation has been cancelled for lead "${leadId}".`)
    }
  }
}