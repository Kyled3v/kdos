/**
 * GPUDetector
 *
 * Represents the outcome of a hardware capability probe for local AI
 * inference: detected GPU(s), available VRAM, and whether CPU fallback
 * is required. GPUDetector itself performs no actual hardware querying
 * (no networking, no system calls) — it is a pure data-shape and
 * decision-rule module. The concrete probe is supplied by the caller as
 * a HardwareProbe implementation and injected in.
 */

export enum ComputeMode {
  GPU = "GPU",
  CPU_FALLBACK = "CPU_FALLBACK",
}

export interface DetectedGPU {
  readonly name: string;
  readonly vramBytes: number;
}

export interface HardwareSnapshot {
  readonly gpus: readonly DetectedGPU[];
  readonly totalSystemRAMBytes: number;
}

/**
 * HardwareProbe
 *
 * Dependency-injection boundary describing how GPUDetector obtains raw
 * hardware information. The concrete implementation (querying the OS,
 * drivers, etc.) is owned and supplied by the caller, not by this file.
 */
export interface HardwareProbe {
  probe(): HardwareSnapshot;
}

export interface GPUDetectionResult {
  readonly mode: ComputeMode;
  readonly gpus: readonly DetectedGPU[];
  readonly totalVRAMBytes: number;
  readonly detectedAt: Date;
}

export class GPUDetector {
  private readonly probe: HardwareProbe;

  /**
   * Constructs a GPUDetector bound to a specific HardwareProbe, supplied
   * via dependency injection.
   */
  public constructor(probe: HardwareProbe) {
    this.probe = probe;
  }

  /**
   * Runs hardware detection and classifies the result as GPU-capable or
   * requiring CPU fallback.
   */
  public detect(): GPUDetectionResult {
    const snapshot = this.probe.probe();
    const totalVRAMBytes = snapshot.gpus.reduce((sum, gpu) => sum + gpu.vramBytes, 0);

    const mode = snapshot.gpus.length > 0 && totalVRAMBytes > 0 ? ComputeMode.GPU : ComputeMode.CPU_FALLBACK;

    return {
      mode,
      gpus: snapshot.gpus,
      totalVRAMBytes,
      detectedAt: new Date(),
    };
  }

  /**
   * Returns true if the detected hardware has sufficient VRAM for the
   * given requirement, without falling back to CPU.
   */
  public canRunOnGPU(minimumVRAMBytes: number): boolean {
    const result = this.detect();
    return result.mode === ComputeMode.GPU && result.totalVRAMBytes >= minimumVRAMBytes;
  }
}