/**
 * Base contracts for every AI employee in KDOS V2. This file defines
 * no implementation — it establishes the shared shape every current
 * and future AI employee must conform to, whether KDOS employs a
 * handful of employees or several hundred.
 */

/**
 * The full catalogue of specialist roles an AI employee may occupy.
 * New roles are added here as the workforce grows; no employee may
 * declare a role outside this enum.
 */
export enum EmployeeRole {
  EXECUTIVE_ASSISTANT = "executive-assistant",
  SOFTWARE_ENGINEER = "software-engineer",
  QA_ENGINEER = "qa-engineer",
  DEVOPS_ENGINEER = "devops-engineer",
  CYBERSECURITY_ENGINEER = "cybersecurity-engineer",
  PROJECT_MANAGER = "project-manager",
  GRAPHIC_DESIGNER = "graphic-designer",
  CONTENT_CREATOR = "content-creator",
  MARKETING_STRATEGIST = "marketing-strategist",
  SALES_REPRESENTATIVE = "sales-representative",
  OUTREACH_SPECIALIST = "outreach-specialist",
  FINANCIAL_ANALYST = "financial-analyst",
  DATA_ANALYST = "data-analyst",
  SUPPORT_AGENT = "support-agent",
  RESEARCHER = "researcher",
  LEGAL_ADVISOR = "legal-advisor",
  HR_MANAGER = "hr-manager",
}

/**
 * The urgency level of a unit of work assigned to an employee.
 */
export type EmployeeTaskPriority = "low" | "medium" | "high" | "urgent";

/**
 * A unit of work assigned to an AI employee. This is the sole input
 * surface for employee execution — employees never receive raw user
 * input directly.
 */
export interface EmployeeTask {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly role: EmployeeRole;
  readonly priority: EmployeeTaskPriority;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: Date;
}

/**
 * The structured outcome of an employee's execution of a task. This
 * is the sole output surface for employee execution — employees never
 * communicate results directly to the user.
 */
export interface EmployeeResult {
  readonly taskId: string;
  readonly employeeId: string;
  readonly success: boolean;
  readonly summary: string;
  readonly output: unknown;
  readonly issues: readonly string[];
  readonly suggestions: readonly string[];
  readonly completedAt: Date;
}

/**
 * Contextual information supplied alongside a task at execution time,
 * scoping the request within the broader system without exposing
 * internal infrastructure to the employee.
 */
export interface EmployeeContext {
  readonly requestId: string;
  readonly workflowId: string | null;
  readonly correlationId: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * The contract every AI employee in KDOS must implement, regardless of
 * role, department, or seniority. This interface is the single point
 * of integration between the workforce and the systems that dispatch
 * work to it (the TaskDispatcher and its orchestrators).
 */
export interface Employee {
  readonly id: string;
  readonly name: string;
  readonly role: EmployeeRole;
  readonly description: string;
  execute(task: EmployeeTask, context: EmployeeContext): Promise<EmployeeResult>;
}