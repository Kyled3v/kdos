/**
 * WorkflowRegistry.ts
 *
 * Location: src/core/workflow/WorkflowRegistry.ts
 *
 * WorkflowRegistry is the in-memory store of every Workflow
 * definition known to KDOS. It performs no execution of its own —
 * WorkflowEngine reads from it to know what a workflow's steps are,
 * but running a workflow is entirely WorkflowEngine's responsibility.
 */

import type { Workflow } from './Workflow'

/**
 * WorkflowRegistry
 *
 * Single responsibility: hold Workflow definitions and provide
 * registration, removal, lookup, and listing over them.
 *
 * This class:
 *   - Stores workflows in a Map<string, Workflow>, keyed by workflow
 *     id.
 *   - Performs no execution, no AI calls, no database, and no
 *     networking.
 *   - Never mutates a returned Workflow in place; every change
 *     produces a new, frozen record.
 *   - Is dependency-injection ready: it takes no external
 *     dependencies, so it can be constructed freely or supplied
 *     wherever a WorkflowRegistry is required.
 */
export class WorkflowRegistry {
  /**
   * Internal in-memory workflow store, keyed by workflow id.
   */
  private readonly workflows = new Map<string, Workflow>()

  /**
   * Registers a Workflow definition. If a workflow with the same id
   * is already registered, it is replaced with the new definition.
   *
   * @param workflow - The Workflow to register.
   * @returns The registered Workflow.
   */
  public register(workflow: Workflow): Workflow {
    const frozen = Object.freeze({ ...workflow, steps: [...workflow.steps] })
    this.workflows.set(frozen.id, frozen)
    return frozen
  }

  /**
   * Removes a Workflow definition from the registry.
   *
   * @param workflowId - The id of the Workflow to remove.
   * @throws Error if no Workflow exists for the given id.
   */
  public remove(workflowId: string): void {
    this.requireWorkflow(workflowId)
    this.workflows.delete(workflowId)
  }

  /**
   * Finds a single Workflow definition by id.
   *
   * @param workflowId - The id of the Workflow to find.
   * @returns The Workflow, or undefined if no Workflow exists for
   *          the given id.
   */
  public find(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId)
  }

  /**
   * Lists every registered Workflow, optionally filtered by enabled
   * state.
   *
   * @param filter - Optional filters to narrow the result set.
   * @param filter.enabled - If supplied, only workflows with this
   *        enabled state are returned.
   * @returns The matching Workflows.
   */
  public list(filter?: { enabled?: boolean }): Workflow[] {
    const all = [...this.workflows.values()]
    return filter?.enabled === undefined
      ? all
      : all.filter((workflow) => workflow.enabled === filter.enabled)
  }

  /**
   * Retrieves a Workflow by id or throws if none exists, so calling
   * methods can operate on a guaranteed-defined Workflow.
   */
  private requireWorkflow(workflowId: string): Workflow {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`WorkflowRegistry: no workflow found for id "${workflowId}".`)
    }
    return workflow
  }
}