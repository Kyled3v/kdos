/**
 * MemorySynchronizer.ts
 *
 * Location: src/core/workforce/memory/MemorySynchronizer.ts
 *
 * MemorySynchronizer connects completed work with long-term company
 * knowledge by turning each ExecutionResult into an immutable
 * MemoryRecord and making that history retrievable by workflow or by
 * employee.
 *
 * MemorySynchronizer performs no executive reasoning, dispatches no
 * work, and calls no AI — it is a pure, storage-agnostic record-
 * keeper sitting behind an in-memory store. Swapping that store for a
 * database or filesystem later is an implementation detail of this
 * class's private storage layer, not a change to its public contract.
 *
 * NOTE ON IMPORTS:
 * ExecutionResult and Workflow are imported from their existing
 * locations rather than redefined here. Adjust the paths below if the
 * actual module locations differ:
 *   - ExecutionResult: '../execution/ExecutionEngine'
 *   - Workflow:         '../workflow/WorkflowEngine'
 */

import type { ExecutionResult } from '../execution/ExecutionEngine'
import type { Workflow } from '../workflow/WorkflowEngine'

/**
 * An immutable record of a single completed task, linking its
 * outcome back to the workflow and employee that produced it.
 */
export interface MemoryRecord {
  readonly id: string
  readonly workflowId: string
  readonly taskId: string
  readonly employeeId: string
  readonly summary: string
  readonly output: string
  readonly createdAt: Date
  readonly metadata: Record<string, unknown>
}

/**
 * MemorySynchronizer
 *
 * Single responsibility: convert ExecutionResults into immutable
 * MemoryRecords, store them, and make them retrievable by workflow or
 * employee.
 *
 * This class:
 *   - Performs no AI calls.
 *   - Performs no executive reasoning or decision-making.
 *   - Dispatches no work.
 *   - Uses in-memory storage only — no database, no filesystem.
 *   - Is dependency-injection ready: it takes no external
 *     dependencies, so it can be constructed freely or supplied
 *     wherever a MemorySynchronizer is required.
 */
export class MemorySynchronizer {
  /**
   * Internal in-memory record store, keyed by record id.
   */
  private readonly records = new Map<string, MemoryRecord>()

  /**
   * Stores a single ExecutionResult as an immutable MemoryRecord.
   *
   * A Workflow may optionally be supplied to attribute the record to
   * its originating workflowId (ExecutionResult alone does not carry
   * one). When omitted, the record is stored with an empty
   * workflowId and can still be retrieved via findByEmployee.
   *
   * @param result - The ExecutionResult to convert and store.
   * @param workflow - The Workflow this result belongs to, if known.
   * @returns The newly created, immutable MemoryRecord.
   */
  public store(result: ExecutionResult, workflow?: Workflow): MemoryRecord {
    const record: MemoryRecord = Object.freeze({
      id: this.generateRecordId(result.taskId),
      workflowId: workflow?.id ?? '',
      taskId: result.taskId,
      employeeId: result.employeeId,
      summary: this.buildSummary(result),
      output: result.response,
      createdAt: result.completedAt,
      metadata: Object.freeze(this.buildMetadata(result)),
    })

    this.records.set(record.id, record)
    return record
  }

  /**
   * Stores a batch of ExecutionResults, all attributed to the same
   * Workflow when provided.
   *
   * @param results - The ExecutionResults to convert and store.
   * @param workflow - The Workflow these results belong to, if known.
   * @returns The newly created MemoryRecords, in the same order as
   *          the input results.
   */
  public storeBatch(results: ExecutionResult[], workflow?: Workflow): MemoryRecord[] {
    return results.map((result) => this.store(result, workflow))
  }

  /**
   * Retrieves every MemoryRecord associated with a given workflow id,
   * in the order they were stored.
   *
   * @param workflowId - The workflow id to search for.
   * @returns Matching MemoryRecords, or an empty array if none exist.
   */
  public findByWorkflow(workflowId: string): MemoryRecord[] {
    return [...this.records.values()].filter(
      (record) => record.workflowId === workflowId
    )
  }

  /**
   * Retrieves every MemoryRecord associated with a given employee id,
   * in the order they were stored.
   *
   * @param employeeId - The employee id to search for.
   * @returns Matching MemoryRecords, or an empty array if none exist.
   */
  public findByEmployee(employeeId: string): MemoryRecord[] {
    return [...this.records.values()].filter(
      (record) => record.employeeId === employeeId
    )
  }

  /**
   * Removes every MemoryRecord associated with a given workflow id.
   *
   * @param workflowId - The workflow id whose records should be
   *        cleared.
   */
  public clearWorkflow(workflowId: string): void {
    for (const [id, record] of this.records.entries()) {
      if (record.workflowId === workflowId) {
        this.records.delete(id)
      }
    }
  }

  /**
   * Builds a short human-readable summary of an ExecutionResult for
   * quick scanning without reading the full output.
   */
  private buildSummary(result: ExecutionResult): string {
    if (!result.success) {
      return `Task ${result.taskId} failed after ${result.durationMs}ms: ${
        result.error ?? 'unknown error'
      }`
    }
    return `Task ${result.taskId} completed successfully in ${result.durationMs}ms.`
  }

  /**
   * Builds supplementary metadata captured alongside each record,
   * kept separate from the primary fields so future metadata
   * additions do not require changing the MemoryRecord shape.
   */
  private buildMetadata(result: ExecutionResult): Record<string, unknown> {
    return {
      success: result.success,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      durationMs: result.durationMs,
      error: result.error,
    }
  }

  /**
   * Generates a deterministic-format record identifier.
   */
  private generateRecordId(taskId: string): string {
    return `memory-${taskId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}