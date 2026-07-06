/**
 * Core type definitions for the KDOS AI Workforce.
 * Every AI employee in KDOS is represented and governed by these types.
 */

/**
 * Unique identifier for an employee.
 */
export type EmployeeId = string;

/**
 * The functional role an employee performs within KDOS.
 */
export type EmployeeRole =
  | "executive-assistant"
  | "software-engineer"
  | "project-manager"
  | "marketing-strategist"
  | "sales-representative"
  | "outreach-specialist"
  | "financial-analyst"
  | "support-agent"
  | "researcher";

/**
 * The department an employee belongs to.
 */
export type EmployeeDepartment =
  | "executive"
  | "development"
  | "marketing"
  | "sales"
  | "outreach"
  | "finance"
  | "support"
  | "research";

/**
 * The current operational status of an employee.
 */
export type EmployeeStatus =
  | "active"
  | "idle"
  | "busy"
  | "paused"
  | "offline"
  | "error";

/**
 * A discrete competency an employee possesses.
 */
export interface EmployeeSkill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly proficiency: number;
}

/**
 * The current priority level of a task assigned to an employee.
 */
export type EmployeeTaskPriority = "low" | "medium" | "high" | "urgent";

/**
 * The current status of a task assigned to an employee.
 */
export type EmployeeTaskStatus =
  | "pending"
  | "in-progress"
  | "blocked"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * A unit of work assigned to an employee.
 */
export interface EmployeeTask {
  readonly id: string;
  readonly employeeId: EmployeeId;
  readonly title: string;
  readonly description: string;
  readonly status: EmployeeTaskStatus;
  readonly priority: EmployeeTaskPriority;
  readonly workflowId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly dueAt: Date | null;
  readonly completedAt: Date | null;
}

/**
 * The classification of a stored memory entry.
 */
export type EmployeeMemoryType =
  | "short-term"
  | "long-term"
  | "episodic"
  | "procedural";

/**
 * A unit of memory retained by an employee.
 */
export interface EmployeeMemory {
  readonly id: string;
  readonly employeeId: EmployeeId;
  readonly type: EmployeeMemoryType;
  readonly content: string;
  readonly context: Record<string, unknown>;
  readonly createdAt: Date;
  readonly expiresAt: Date | null;
}

/**
 * A tool an employee is permitted to invoke.
 */
export interface EmployeeTool {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly isEnabled: boolean;
}

/**
 * The complete profile record for an AI employee.
 */
export interface EmployeeProfile {
  readonly id: EmployeeId;
  readonly name: string;
  readonly role: EmployeeRole;
  readonly department: EmployeeDepartment;
  readonly status: EmployeeStatus;
  readonly skills: readonly EmployeeSkill[];
  readonly tools: readonly EmployeeTool[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}