/**
 * WorkflowExecution.ts
 *
 * Location: src/core/workflow/WorkflowExecution.ts
 *
 * WorkflowExecution records the state of a single run of a Workflow:
 * which workflow it's running, where it currently is, and its
 * lifecycle status. This file contains no logic — it is a pure data
 * shape maintained by WorkflowEngine.
 */

/**
 * The lifecycle status of a WorkflowExecution.
 */
export enum WorkflowExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * A single run of a Workflow.
 */
export interface WorkflowExecution {
  readonly executionId: string
  readonly workflowId: string
  readonly status: WorkflowExecutionStatus
  readonly currentStep: string | null
  readonly startedAt: Date
  readonly completedAt: Date | null
}