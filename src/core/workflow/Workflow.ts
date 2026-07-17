/**
 * Workflow.ts
 *
 * Location: src/core/workflow/Workflow.ts
 *
 * Workflow describes a reusable definition of how work moves through
 * KDOS: a named, ordered set of WorkflowSteps. This file contains no
 * logic — it is a pure data shape, registered via WorkflowRegistry and
 * run via WorkflowEngine.
 */

import type { WorkflowStep } from './WorkflowStep'

/**
 * A reusable workflow definition: a named set of steps describing how
 * a particular kind of work should move through the organization.
 */
export interface Workflow {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly steps: WorkflowStep[]
  readonly enabled: boolean
}