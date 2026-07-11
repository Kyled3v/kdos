import { aiGateway, type AIRequest, type AIResponse } from "../gateway/AIGateway";
import type {
  Employee,
  EmployeeContext,
  EmployeeResult,
  EmployeeRole,
  EmployeeTask,
} from "../types/Employee";

/**
 * Abstract foundation for every specialised AI employee in KDOS V2.
 * Provides the shared execution lifecycle, input validation, logging
 * hooks, AI Gateway access, and the integration point for future
 * memory support. Every specialised employee (Software Engineer,
 * Executive Assistant, Graphic Designer, Content Creator, and so on)
 * extends this class and implements only its role-specific reasoning.
 */
export abstract class BaseEmployee implements Employee {
  public readonly id: string;
  public readonly name: string;
  public readonly role: EmployeeRole;
  public readonly description: string;

  protected constructor(params: {
    id: string;
    name: string;
    role: EmployeeRole;
    description: string;
  }) {
    if (!params.id || params.id.trim().length === 0) {
      throw new Error("BaseEmployee: id is required.");
    }

    if (!params.name || params.name.trim().length === 0) {
      throw new Error("BaseEmployee: name is required.");
    }

    if (!params.role) {
      throw new Error("BaseEmployee: role is required.");
    }

    if (!params.description || params.description.trim().length === 0) {
      throw new Error("BaseEmployee: description is required.");
    }

    this.id = params.id;
    this.name = params.name;
    this.role = params.role;
    this.description = params.description;
  }

  /**
   * The single public entry point for executing a task. Validates the
   * task and context, delegates to the role-specific implementation
   * via performExecution(), and guarantees a well-formed EmployeeResult
   * is always returned — even on failure — so callers never need to
   * catch exceptions from a successfully assigned task.
   */
  public async execute(
    task: EmployeeTask,
    context: EmployeeContext
  ): Promise<EmployeeResult> {
    this.validateTask(task);
    this.validateContext(context);
    this.logExecutionStart(task, context);

    try {
      const result = await this.performExecution(task, context);

      this.logExecutionSuccess(task, result);
      this.recordMemory(task, result);

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred.";

      this.logExecutionFailure(task, message);

      const failureResult = this.buildFailureResult(task, message);

      this.recordMemory(task, failureResult);

      return failureResult;
    }
  }

  /**
   * Performs the role-specific work for a task. Must be implemented
   * by every concrete employee. Implementations should throw on
   * failure rather than returning a failure result directly — the
   * base execute() method converts thrown errors into a structured
   * failure result automatically.
   */
  protected abstract performExecution(
    task: EmployeeTask,
    context: EmployeeContext
  ): Promise<EmployeeResult>;

  /**
   * Sends a request through the AI Gateway. This is the only sanctioned
   * path to AI reasoning available to a concrete employee; no employee
   * may import or call a provider adapter directly.
   */
  protected async ai(request: AIRequest): Promise<AIResponse> {
    return aiGateway.generate(request);
  }

  /**
   * Validates that a task is well-formed and addressed to this
   * employee's role before execution begins.
   */
  protected validateTask(task: EmployeeTask): void {
    if (!task) {
      throw new Error(`${this.name}: task is required.`);
    }

    if (!task.id || task.id.trim().length === 0) {
      throw new Error(`${this.name}: task.id is required.`);
    }

    if (!task.title || task.title.trim().length === 0) {
      throw new Error(`${this.name}: task.title is required.`);
    }

    if (!task.description || task.description.trim().length === 0) {
      throw new Error(`${this.name}: task.description is required.`);
    }

    if (task.role !== this.role) {
      throw new Error(
        `${this.name}: task role "${task.role}" does not match employee role "${this.role}".`
      );
    }
  }

  /**
   * Validates that execution context is well-formed before execution
   * begins.
   */
  protected validateContext(context: EmployeeContext): void {
    if (!context) {
      throw new Error(`${this.name}: context is required.`);
    }

    if (!context.requestId || context.requestId.trim().length === 0) {
      throw new Error(`${this.name}: context.requestId is required.`);
    }

    if (!context.correlationId || context.correlationId.trim().length === 0) {
      throw new Error(`${this.name}: context.correlationId is required.`);
    }
  }

  /**
   * Builds a structured failure result for a task that threw during
   * execution.
   */
  protected buildFailureResult(
    task: EmployeeTask,
    message: string
  ): EmployeeResult {
    return {
      taskId: task.id,
      employeeId: this.id,
      success: false,
      summary: `${this.name} failed to complete "${task.title}": ${message}`,
      output: null,
      issues: [],
      suggestions: [],
      completedAt: new Date(),
    };
  }

  /**
   * Logging hook invoked immediately before execution begins.
   * Concrete employees or a shared logging integration may override
   * this to emit structured logs; the default implementation is
   * intentionally silent so BaseEmployee carries no logging transport
   * dependency of its own.
   */
  protected logExecutionStart(
    _task: EmployeeTask,
    _context: EmployeeContext
  ): void {
    // Intentionally silent by default. Override to integrate logging.
  }

  /**
   * Logging hook invoked immediately after successful execution.
   */
  protected logExecutionSuccess(
    _task: EmployeeTask,
    _result: EmployeeResult
  ): void {
    // Intentionally silent by default. Override to integrate logging.
  }

  /**
   * Logging hook invoked immediately after failed execution.
   */
  protected logExecutionFailure(_task: EmployeeTask, _message: string): void {
    // Intentionally silent by default. Override to integrate logging.
  }

  /**
   * Memory integration hook invoked after every execution, successful
   * or not. The default implementation is intentionally silent —
   * BaseEmployee carries no hard dependency on a specific memory
   * store. Concrete employees override this to persist episodic
   * memory once a memory engine is wired in.
   */
  protected recordMemory(_task: EmployeeTask, _result: EmployeeResult): void {
    // Intentionally silent by default. Override to integrate memory.
  }
}