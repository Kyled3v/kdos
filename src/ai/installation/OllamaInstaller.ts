/**
 * OllamaInstaller
 *
 * Manages the install/uninstall lifecycle specifically for the Ollama
 * runtime. This file contains no networking and no Ollama API calls —
 * the actual install mechanism (downloading and running an installer,
 * invoking a package manager, etc.) is supplied by the caller as an
 * InstallerTransport implementation and injected in. This is one
 * concrete installer among the RuntimeInstaller abstraction's targets.
 */

import { AIRuntime, AIRuntimeKind, AIRuntimeStatus } from "./AIRuntime";

/**
 * InstallerTransport
 *
 * Dependency-injection boundary describing how OllamaInstaller performs
 * the actual install/uninstall/version-check operations. The concrete
 * mechanism is owned and supplied by the caller, not by this file.
 */
export interface InstallerTransport {
  install(): { version: string; executablePath: string };
  uninstall(): void;
  detectExistingInstallation(): { version: string; executablePath: string } | null;
}

export class OllamaInstaller {
  private readonly transport: InstallerTransport;

  /**
   * Constructs an OllamaInstaller bound to a specific InstallerTransport,
   * supplied via dependency injection.
   */
  public constructor(transport: InstallerTransport) {
    this.transport = transport;
  }

  /**
   * Installs Ollama, returning an AIRuntime descriptor transitioned
   * through INSTALLING to INSTALLED with recorded version/path. Throws
   * if the underlying install operation fails.
   */
  public install(runtimeId: string): AIRuntime {
    let runtime = AIRuntime.create({ id: runtimeId, kind: AIRuntimeKind.OLLAMA, name: "Ollama" });
    runtime = runtime.withStatus(AIRuntimeStatus.INSTALLING);

    try {
      const result = this.transport.install();
      runtime = runtime.withStatus(AIRuntimeStatus.INSTALLED);
      runtime = runtime.withInstallationDetails(result.version, result.executablePath);
    } catch (error) {
      runtime = runtime.withStatus(AIRuntimeStatus.FAILED);
      throw error;
    }

    return runtime;
  }

  /**
   * Uninstalls Ollama, returning an AIRuntime descriptor transitioned
   * through UNINSTALLING to NOT_INSTALLED.
   */
  public uninstall(runtime: AIRuntime): AIRuntime {
    let updated = runtime.withStatus(AIRuntimeStatus.UNINSTALLING);
    this.transport.uninstall();
    updated = updated.withStatus(AIRuntimeStatus.NOT_INSTALLED);
    return updated;
  }

  /**
   * Detects an existing Ollama installation on the host, returning an
   * AIRuntime descriptor in INSTALLED status if found, or null if Ollama
   * is not present.
   */
  public detectExisting(runtimeId: string): AIRuntime | null {
    const detected = this.transport.detectExistingInstallation();
    if (!detected) {
      return null;
    }

    let runtime = AIRuntime.create({ id: runtimeId, kind: AIRuntimeKind.OLLAMA, name: "Ollama" });
    runtime = runtime.withStatus(AIRuntimeStatus.INSTALLING);
    runtime = runtime.withStatus(AIRuntimeStatus.INSTALLED);
    runtime = runtime.withInstallationDetails(detected.version, detected.executablePath);

    return runtime;
  }
}