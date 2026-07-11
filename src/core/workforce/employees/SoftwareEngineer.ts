import { BaseEmployee } from "./BaseEmployee";
import {
  EmployeeRole,
  type EmployeeContext,
  type EmployeeResult,
  type EmployeeTask,
} from "../types/Employee";

/**
 * The engineering disciplines the Software Engineer is capable of
 * reasoning across when producing a solution.
 */
export type SoftwareEngineeringCapability =
  | "architecture"
  | "backend"
  | "frontend"
  | "database"
  | "debugging"
  | "testing"
  | "optimisation"
  | "documentation";

const ALL_CAPABILITIES: readonly SoftwareEngineeringCapability[] = [
  "architecture",
  "backend",
  "frontend",
  "database",
  "debugging",
  "testing",
  "optimisation",
  "documentation",
];

/**
 * Internal representation of the architectural plan produced before
 * implementation begins.
 */
interface ArchitecturePlan {
  readonly relevantCapabilities: readonly SoftwareEngineeringCapability[];
  readonly language: string;
  readonly architectureNotes: string;
  readonly steps: readonly string[];
}

/**
 * Internal representation of the testing and documentation pass
 * performed after implementation.
 */
interface QualityPass {
  readonly tests: string;
  readonly documentation: string;
  readonly issues: readonly string[];
  readonly suggestions: readonly string[];
}

/**
 * The Software Engineer is a senior-level AI employee capable of
 * reasoning across architecture, backend, frontend, database,
 * debugging, testing, optimisation, and documentation. It receives
 * tasks and context exclusively from the dispatcher layer, reasons
 * exclusively through the AI Gateway (inherited from BaseEmployee),
 * and returns a structured EmployeeResult. It never communicates with
 * the user directly.
 */
export class SoftwareEngineer extends BaseEmployee {
  public constructor(id: string, name: string) {
    super({
      id,
      name,
      role: EmployeeRole.SOFTWARE_ENGINEER,
      description:
        "Senior software engineer covering architecture, backend, frontend, database, " +
        "debugging, testing, optimisation, and documentation.",
    });
  }

  /**
   * Performs the full engineering workflow for a task: architectural
   * planning, implementation, and a combined testing/documentation
   * pass. Throws on failure; BaseEmployee.execute() converts thrown
   * errors into a structured failure result automatically.
   */
  protected async performExecution(
    task: EmployeeTask,
    _context: EmployeeContext
  ): Promise<EmployeeResult> {
    const plan = await this.planArchitecture(task);
    const code = await this.implement(task, plan);
    const quality = await this.assureQuality(code, plan);

    return {
      taskId: task.id,
      employeeId: this.id,
      success: true,
      summary: `Implemented "${task.title}" in ${plan.language}, covering: ${plan.relevantCapabilities.join(", ")}.`,
      output: {
        language: plan.language,
        architectureNotes: plan.architectureNotes,
        code,
        tests: quality.tests,
        documentation: quality.documentation,
      },
      issues: quality.issues,
      suggestions: quality.suggestions,
      completedAt: new Date(),
    };
  }

  /**
   * Determines which engineering capabilities a task requires and
   * produces an architectural plan and language choice. Uses the AI
   * Gateway exclusively via the inherited ai() helper.
   */
  private async planArchitecture(task: EmployeeTask): Promise<ArchitecturePlan> {
    const response = await this.ai({
      messages: [
        {
          role: "system",
          content:
            "You are a senior software engineer's architecture-planning function inside " +
            "an internal AI workforce. Determine which engineering capabilities this task " +
            "requires and produce a concrete implementation plan. Respond with ONLY a " +
            'JSON object, no prose, no markdown fences. The object must have exactly ' +
            'these fields: "relevantCapabilities" (array of strings, each one of: ' +
            ALL_CAPABILITIES.map((capability) => `"${capability}"`).join(", ") +
            '), "language" (string, the most appropriate programming language or stack), ' +
            '"architectureNotes" (string, a concise architectural rationale), and ' +
            '"steps" (array of strings, each a discrete ordered implementation step).',
        },
        {
          role: "user",
          content: `Title: ${task.title}\nDescription: ${task.description}\nPriority: ${task.priority}`,
        },
      ],
    });

    return this.parseArchitecturePlan(response.content);
  }

  /**
   * Produces production-quality code implementing the architectural
   * plan. Uses the AI Gateway exclusively.
   */
  private async implement(
    task: EmployeeTask,
    plan: ArchitecturePlan
  ): Promise<string> {
    const response = await this.ai({
      messages: [
        {
          role: "system",
          content:
            "You are a senior software engineer producing production-quality code inside " +
            "an internal AI workforce. Follow the architectural plan exactly, applying " +
            "sound engineering practice across the capabilities identified. Respond with " +
            "ONLY the complete source code, no prose, no markdown fences, no " +
            "explanations before or after the code.",
        },
        {
          role: "user",
          content: `Task: ${task.title}\nDescription: ${task.description}\nLanguage: ${plan.language}\nCapabilities: ${plan.relevantCapabilities.join(", ")}\nArchitecture notes: ${plan.architectureNotes}\nPlan:\n${plan.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`,
        },
      ],
    });

    if (!response.content || response.content.trim().length === 0) {
      throw new Error("SoftwareEngineer: received empty implementation output.");
    }

    return response.content;
  }

  /**
   * Produces tests and documentation for the implemented code, and
   * identifies any remaining issues or optimisation/refactoring
   * suggestions. Uses the AI Gateway exclusively.
   */
  private async assureQuality(
    code: string,
    plan: ArchitecturePlan
  ): Promise<QualityPass> {
    const response = await this.ai({
      messages: [
        {
          role: "system",
          content:
            "You are a senior software engineer's testing and documentation function " +
            "inside an internal AI workforce. Review the implemented code, write tests " +
            "for it, document it, and identify any bugs or optimisation opportunities. " +
            'Respond with ONLY a JSON object, no prose, no markdown fences. The object ' +
            'must have exactly these fields: "tests" (string, complete test code), ' +
            '"documentation" (string, usage and API documentation), "issues" (array of ' +
            'strings describing bugs or defects found, may be empty), and "suggestions" ' +
            "(array of strings describing optimisation or refactoring opportunities, may " +
            "be empty).",
        },
        {
          role: "user",
          content: `Language: ${plan.language}\nCapabilities: ${plan.relevantCapabilities.join(", ")}\n\nCode:\n${code}`,
        },
      ],
    });

    return this.parseQualityPass(response.content);
  }

  /**
   * Parses and validates the AI-generated architecture plan.
   */
  private parseArchitecturePlan(rawContent: string): ArchitecturePlan {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error(
        "SoftwareEngineer: failed to parse architecture plan as JSON."
      );
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error(
        "SoftwareEngineer: architecture plan must be a JSON object."
      );
    }

    const candidate = parsed as Record<string, unknown>;

    if (
      !Array.isArray(candidate.relevantCapabilities) ||
      candidate.relevantCapabilities.length === 0 ||
      !candidate.relevantCapabilities.every(
        (entry) =>
          typeof entry === "string" &&
          ALL_CAPABILITIES.includes(entry as SoftwareEngineeringCapability)
      )
    ) {
      throw new Error(
        "SoftwareEngineer: architecture plan has an invalid relevantCapabilities field."
      );
    }

    if (
      typeof candidate.language !== "string" ||
      candidate.language.trim().length === 0
    ) {
      throw new Error(
        "SoftwareEngineer: architecture plan has an invalid language field."
      );
    }

    if (
      typeof candidate.architectureNotes !== "string" ||
      candidate.architectureNotes.trim().length === 0
    ) {
      throw new Error(
        "SoftwareEngineer: architecture plan has an invalid architectureNotes field."
      );
    }

    if (
      !Array.isArray(candidate.steps) ||
      candidate.steps.length === 0 ||
      !candidate.steps.every((entry) => typeof entry === "string")
    ) {
      throw new Error(
        "SoftwareEngineer: architecture plan has an invalid steps field."
      );
    }

    return {
      relevantCapabilities:
        candidate.relevantCapabilities as SoftwareEngineeringCapability[],
      language: candidate.language,
      architectureNotes: candidate.architectureNotes,
      steps: candidate.steps as string[],
    };
  }

  /**
   * Parses and validates the AI-generated testing and documentation
   * pass.
   */
  private parseQualityPass(rawContent: string): QualityPass {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error("SoftwareEngineer: failed to parse quality pass as JSON.");
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("SoftwareEngineer: quality pass must be a JSON object.");
    }

    const candidate = parsed as Record<string, unknown>;

    if (typeof candidate.tests !== "string" || candidate.tests.trim().length === 0) {
      throw new Error("SoftwareEngineer: quality pass has an invalid tests field.");
    }

    if (
      typeof candidate.documentation !== "string" ||
      candidate.documentation.trim().length === 0
    ) {
      throw new Error(
        "SoftwareEngineer: quality pass has an invalid documentation field."
      );
    }

    if (
      !Array.isArray(candidate.issues) ||
      !candidate.issues.every((entry) => typeof entry === "string")
    ) {
      throw new Error("SoftwareEngineer: quality pass has an invalid issues field.");
    }

    if (
      !Array.isArray(candidate.suggestions) ||
      !candidate.suggestions.every((entry) => typeof entry === "string")
    ) {
      throw new Error(
        "SoftwareEngineer: quality pass has an invalid suggestions field."
      );
    }

    return {
      tests: candidate.tests,
      documentation: candidate.documentation,
      issues: candidate.issues as string[],
      suggestions: candidate.suggestions as string[],
    };
  }
}