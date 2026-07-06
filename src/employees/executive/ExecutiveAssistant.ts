import { randomUUID } from "crypto";
import { BaseEmployee } from "../../core/workforce/employee/BaseEmployee";
import { taskDispatcher } from "../../core/workforce/dispatcher/TaskDispatcher";
import { employeeRegistry } from "../../core/workforce/registry/EmployeeRegistry";
import { aiGateway } from "../../core/workforce/gateway/AIGateway";
import type {
  EmployeeId,
  EmployeeRole,
  EmployeeDepartment,
  EmployeeSkill,
  EmployeeTool,
  EmployeeTask,
} from "../../core/workforce/employee/types";

/**
 * A single unit of work identified by the planning phase, prior to an
 * employee being assigned to execute it.
 */
interface PlannedUnit {
  readonly title: string;
  readonly description: string;
  readonly role: EmployeeRole;
  readonly priority: "low" | "medium" | "high" | "urgent";
}

/**
 * The outcome of a fully monitored execution cycle.
 */
interface ExecutionOutcome {
  readonly completedTaskIds: readonly string[];
  readonly failedTaskIds: readonly string[];
}

/**
 * The Executive Assistant is the orchestration head of the KDOS AI
 * workforce. It receives requests from Kyle, interprets intent, breaks
 * work into discrete tasks, delegates those tasks to the appropriate
 * specialist employees through the TaskDispatcher, monitors execution,
 * and returns a final result. It never calls an AI provider directly;
 * all AI reasoning is performed through the AIGateway, and all task
 * execution is performed through the TaskDispatcher.
 */
export class ExecutiveAssistant extends BaseEmployee {
  private static readonly POLL_INTERVAL_MS = 500;
  private static readonly MAX_POLL_ATTEMPTS = 240;

  public constructor(params: {
    id: EmployeeId;
    name: string;
    department: EmployeeDepartment;
    skills: EmployeeSkill[];
    tools: EmployeeTool[];
  }) {
    super({
      id: params.id,
      name: params.name,
      role: "executive-assistant",
      department: params.department,
      skills: params.skills,
      tools: params.tools,
    });
  }

  /**
   * Prepares the Executive Assistant for active duty. Validates that
   * the assistant is correctly registered before accepting work.
   */
  public async initialize(): Promise<void> {
    if (!employeeRegistry.exists(this.id)) {
      throw new Error(
        `ExecutiveAssistant: employee "${this.id}" must be registered in the EmployeeRegistry before initialization.`
      );
    }

    this.updateStatus("idle");
  }

  /**
   * Receives a request from Kyle, plans it into discrete tasks,
   * delegates those tasks to specialist employees, monitors execution
   * to completion, and returns a final summarised result.
   */
  public async execute(userRequest: string): Promise<string> {
    if (!userRequest || userRequest.trim().length === 0) {
      throw new Error("ExecutiveAssistant: userRequest is required.");
    }

    this.updateStatus("busy");

    try {
      const plannedUnits = await this.plan(userRequest);
      const tasks = this.delegate(plannedUnits);
      const outcome = await this.monitor(tasks.map((task) => task.id));
      const result = this.complete(tasks, outcome);

      this.updateStatus("idle");

      return result;
    } catch (error) {
      this.updateStatus("error");
      throw error;
    }
  }

  /**
   * Interprets a natural-language request and breaks it into discrete
   * planned units of work, each tagged with the role best suited to
   * execute it. Uses the AIGateway exclusively; never calls an AI
   * provider directly.
   */
  public async plan(userRequest: string): Promise<PlannedUnit[]> {
    if (!userRequest || userRequest.trim().length === 0) {
      throw new Error("ExecutiveAssistant: userRequest is required.");
    }

    const response = await aiGateway.generate({
      messages: [
        {
          role: "system",
          content:
            "You are the planning function of an Executive Assistant inside an internal " +
            "operating system for a technology agency. Break the user's request into a " +
            "minimal set of discrete units of work. Respond with ONLY a JSON array, no " +
            "prose, no markdown fences. Each element must be an object with exactly these " +
            'fields: "title" (string), "description" (string), "role" (one of: ' +
            '"executive-assistant", "software-engineer", "project-manager", ' +
            '"marketing-strategist", "sales-representative", "outreach-specialist", ' +
            '"financial-analyst", "support-agent", "researcher"), and "priority" (one of: ' +
            '"low", "medium", "high", "urgent").',
        },
        {
          role: "user",
          content: userRequest,
        },
      ],
    });

    return this.parsePlan(response.content);
  }

  /**
   * Delegates a set of planned units to the workforce by resolving an
   * appropriate employee for each unit's role, constructing a formal
   * EmployeeTask, and dispatching it through the TaskDispatcher. Throws
   * if no suitable employee exists for a given role.
   */
  public delegate(plannedUnits: PlannedUnit[]): EmployeeTask[] {
    if (!Array.isArray(plannedUnits) || plannedUnits.length === 0) {
      throw new Error(
        "ExecutiveAssistant: plannedUnits must be a non-empty array."
      );
    }

    const tasks: EmployeeTask[] = [];

    for (const unit of plannedUnits) {
      const candidates = employeeRegistry
        .getByRole(unit.role)
        .filter((employee) => employee.getProfile().status === "idle");

      if (candidates.length === 0) {
        throw new Error(
          `ExecutiveAssistant: no available employee found for role "${unit.role}".`
        );
      }

      const assignee = candidates[0];
      const now = new Date();

      const task: EmployeeTask = {
        id: randomUUID(),
        employeeId: assignee.id,
        title: unit.title,
        description: unit.description,
        status: "pending",
        priority: unit.priority,
        workflowId: null,
        createdAt: now,
        updatedAt: now,
        dueAt: null,
        completedAt: null,
      };

      taskDispatcher.dispatch(task);
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Polls the TaskDispatcher until every delegated task has either
   * completed or failed, or the maximum poll attempts are exhausted.
   * Throws if monitoring times out.
   */
  public async monitor(taskIds: string[]): Promise<ExecutionOutcome> {
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new Error("ExecutiveAssistant: taskIds must be a non-empty array.");
    }

    const pending = new Set(taskIds);
    const completedTaskIds: string[] = [];
    const failedTaskIds: string[] = [];

    for (
      let attempt = 0;
      attempt < ExecutiveAssistant.MAX_POLL_ATTEMPTS && pending.size > 0;
      attempt++
    ) {
      const completedIds = new Set(
        taskDispatcher.completed().map((task) => task.id)
      );
      const failedIds = new Set(taskDispatcher.failed().map((task) => task.id));

      for (const taskId of Array.from(pending)) {
        if (completedIds.has(taskId)) {
          completedTaskIds.push(taskId);
          pending.delete(taskId);
        } else if (failedIds.has(taskId)) {
          failedTaskIds.push(taskId);
          pending.delete(taskId);
        }
      }

      if (pending.size > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, ExecutiveAssistant.POLL_INTERVAL_MS)
        );
      }
    }

    if (pending.size > 0) {
      throw new Error(
        `ExecutiveAssistant: monitoring timed out waiting for task(s): ${Array.from(
          pending
        ).join(", ")}.`
      );
    }

    return { completedTaskIds, failedTaskIds };
  }

  /**
   * Produces the final summarised result for a completed execution
   * cycle. Throws if any delegated task failed.
   */
  public complete(tasks: EmployeeTask[], outcome: ExecutionOutcome): string {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error("ExecutiveAssistant: tasks must be a non-empty array.");
    }

    if (outcome.failedTaskIds.length > 0) {
      const failedTitles = tasks
        .filter((task) => outcome.failedTaskIds.includes(task.id))
        .map((task) => task.title)
        .join(", ");

      throw new Error(
        `ExecutiveAssistant: execution failed for task(s): ${failedTitles}.`
      );
    }

    const summary = tasks
      .map((task) => `- ${task.title}: completed`)
      .join("\n");

    return `All ${tasks.length} task(s) completed successfully.\n${summary}`;
  }

  /**
   * Invokes a tool assigned to the Executive Assistant. The Executive
   * Assistant delegates specialist work to other employees rather than
   * invoking tools directly; a resolved but unsupported tool
   * invocation is a deliberate architectural boundary, not a
   * placeholder.
   */
  public async useTool(toolName: string): Promise<unknown> {
    if (!toolName) {
      throw new Error("ExecutiveAssistant: toolName is required.");
    }

    this.resolveTool(toolName);

    throw new Error(
      `ExecutiveAssistant: direct tool invocation is not supported. ` +
        `Delegate work requiring "${toolName}" to a specialist employee via the TaskDispatcher.`
    );
  }

  /**
   * Determines whether the Executive Assistant can execute the given
   * task. The Executive Assistant only executes tasks explicitly
   * assigned to it; all other work is delegated.
   */
  public canExecute(task: EmployeeTask): boolean {
    if (!task) {
      throw new Error("ExecutiveAssistant: task is required.");
    }

    return task.employeeId === this.id && this.status === "idle";
  }

  /**
   * Parses and validates the AI-generated plan response into a typed
   * array of planned units. Throws if the response is not valid JSON
   * or does not conform to the expected shape.
   */
  private parsePlan(rawContent: string): PlannedUnit[] {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error(
        "ExecutiveAssistant: failed to parse plan response as JSON."
      );
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error(
        "ExecutiveAssistant: plan response must be a non-empty JSON array."
      );
    }

    const validRoles: EmployeeRole[] = [
      "executive-assistant",
      "software-engineer",
      "project-manager",
      "marketing-strategist",
      "sales-representative",
      "outreach-specialist",
      "financial-analyst",
      "support-agent",
      "researcher",
    ];

    const validPriorities: PlannedUnit["priority"][] = [
      "low",
      "medium",
      "high",
      "urgent",
    ];

    return parsed.map((entry, index) => {
      if (typeof entry !== "object" || entry === null) {
        throw new Error(
          `ExecutiveAssistant: plan entry at index ${index} is not an object.`
        );
      }

      const unit = entry as Record<string, unknown>;

      if (typeof unit.title !== "string" || unit.title.trim().length === 0) {
        throw new Error(
          `ExecutiveAssistant: plan entry at index ${index} has an invalid title.`
        );
      }

      if (
        typeof unit.description !== "string" ||
        unit.description.trim().length === 0
      ) {
        throw new Error(
          `ExecutiveAssistant: plan entry at index ${index} has an invalid description.`
        );
      }

      if (
        typeof unit.role !== "string" ||
        !validRoles.includes(unit.role as EmployeeRole)
      ) {
        throw new Error(
          `ExecutiveAssistant: plan entry at index ${index} has an invalid role.`
        );
      }

      if (
        typeof unit.priority !== "string" ||
        !validPriorities.includes(unit.priority as PlannedUnit["priority"])
      ) {
        throw new Error(
          `ExecutiveAssistant: plan entry at index ${index} has an invalid priority.`
        );
      }

      return {
        title: unit.title,
        description: unit.description,
        role: unit.role as EmployeeRole,
        priority: unit.priority as PlannedUnit["priority"],
      };
    });
  }
}