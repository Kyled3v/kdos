/**
 * RuntimeInstaller
 *
 * Generalises installer behaviour across every supported local AI
 * runtime kind (Ollama, LM Studio, llama.cpp, vLLM, and future
 * providers), each represented by an injected InstallerTransport. This
 * file contains no networking and no AI calls — it only coordinates the
 * generic install/uninstall lifecycle over whichever transport is
 * supplied per runtime kind.
 */

import { AIRuntime, AIRuntimeKind, AIRuntimeStatus } from "./AIRuntime";
import { InstallerTransport } from "./OllamaInstaller";

export class RuntimeInstaller {
  private readonly transports: Map<AIRuntimeKind, InstallerTransport>;

  /**
   * Constructs a RuntimeInstaller bound to a set of InstallerTransport
   * implementations keyed by runtime kind, supplied via dependency
   * injection.
   */
  public constructor(transports: ReadonlyMap<AIRuntimeKind, InstallerTransport>) {
    this.transports = new Map(transports);
  }

  /**
   * Registers or replaces the InstallerTransport for a given runtime kind.
   */
  public registerTransport(kind: AIRuntimeKind, transport: InstallerTransport): void {
    this.transports.set(kind, transport);
  }

  /**
   * Installs the runtime of the given kind, returning an AIRuntime
   * descriptor transitioned to INSTALLED. Throws if no transport is
   * registered for that kind, or if the install operation fails.
   */
  public install(runtimeId: string, kind: AIRuntimeKind, name: string): AIRuntime {
    const transport = this.resolveTransport(kind);

    let runtime = AIRuntime.create({ id: runtimeId, kind, name });
    runtime = runtime.withStatus(AIRuntimeStatus.INSTALLING);

    try {
      const result = transport.install();
      runtime = runtime.withStatus(AIRuntimeStatus.INSTALLED);
      runtime = runtime.withInstallationDetails(result.version, result.executablePath);
    } catch (error) {
      runtime = runtime.withStatus(AIRuntimeStatus.FAILED);
      throw error;
    }

    return runtime;
  }

  /**
   * Uninstalls the given runtime, returning it transitioned to
   * NOT_INSTALLED. Throws if no transport is registered for that
   * runtime's kind.
   */
  public uninstall(runtime: AIRuntime): AIRuntime {
    const transport = this.resolveTransport(runtime.kind);

    let updated = runtime.withStatus(AIRuntimeStatus.UNINSTALLING);
    transport.uninstall();
    updated = updated.withStatus(AIRuntimeStatus.NOT_INSTALLED);

    return updated;
  }

  /**
   * Detects an existing installation for the given runtime kind, if any.
   * Throws if no transport is registered for that kind.
   */
  public detectExisting(runtimeId: string, kind: AIRuntimeKind, name: string): AIRuntime | null {
    const transport = this.resolveTransport(kind);
    const detected = transport.detectExistingInstallation();
    if (!detected) {
      return null;
    }

    let runtime = AIRuntime.create({ id: runtimeId, kind, name });
    runtime = runtime.withStatus(AIRuntimeStatus.INSTALLING);
    runtime = runtime.withStatus(AIRuntimeStatus.INSTALLED);
    runtime = runtime.withInstallationDetails(detected.version, detected.executablePath);

    return runtime;
  }

  /**
   * Returns true if an installer transport is registered for the given
   * runtime kind.
   */
  public supports(kind: AIRuntimeKind): boolean {
    return this.transports.has(kind);
  }

  private resolveTransport(kind: AIRuntimeKind): InstallerTransport {
    const transport = this.transports.get(kind);
    if (!transport) {
      throw new Error(`No installer transport registered for runtime kind "${kind}".`);
    }
    return transport;
  }
}