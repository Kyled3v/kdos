/**
 * WorkflowStep.ts
 *
 * Location: src/core/workflow/WorkflowStep.ts
 *
 * WorkflowStep describes a single step within a Workflow: which
 * employee role performs it, what other steps must complete before
 * it can run, and any conditions that must hold for it to be
 * eligible. This file contains no logic — it is a pure data shape
 * consumed by WorkflowEngine.
 */

/**
 * A single condition that must evaluate true against a workflow's
 * execution context for a step to become eligible to run. Kept
 * generic and declarative (rather than executable code) since
 * WorkflowEngine performs no AI and no arbitrary code execution —
 * it only compares a named context field against an expected value.
 */
export interface WorkflowStepCondition {
  readonly field: string
  readonly operator: 'equals' | 'notEquals' | 'exists' | 'notExists'
  readonly value?: unknown
}

/**
 * A single step within a Workflow.
 */
export interface WorkflowStep {
  readonly id: string
  readonly name: string
  readonly employeeRole: string
  readonly dependsOn: string[]
  readonly conditions: WorkflowStepCondition[]
}