/**
 * ModelDownloader
 *
 * Tracks the download lifecycle of a model's weights to local disk. This
 * file contains no actual networking — the transfer mechanism is
 * supplied by the caller as a DownloadTransport implementation and
 * injected in. ModelDownloader only manages download state and progress
 * tracking.
 */

import { ModelManifest } from "./ModelManifest";

export enum DownloadStatus {
  PENDING = "PENDING",
  DOWNLOADING = "DOWNLOADING",
  VERIFYING = "VERIFYING",
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export interface DownloadProgress {
  readonly modelId: string;
  readonly status: DownloadStatus;
  readonly bytesDownloaded: number;
  readonly totalBytes: number;
  readonly updatedAt: Date;
}

/**
 * DownloadTransport
 *
 * Dependency-injection boundary describing how ModelDownloader obtains
 * model weight bytes. The concrete transport (HTTP, local mirror, etc.)
 * is owned and supplied by the caller, not by this file.
 */
export interface DownloadTransport {
  fetchBytes(manifest: ModelManifest, onProgress: (bytesDownloaded: number) => void): Uint8Array;
  verifyIntegrity(manifest: ModelManifest, data: Uint8Array): boolean;
  persist(manifest: ModelManifest, data: Uint8Array): string;
}

export class ModelDownloader {
  private readonly transport: DownloadTransport;
  private readonly progress: Map<string, DownloadProgress>;

  /**
   * Constructs a ModelDownloader bound to a specific DownloadTransport,
   * supplied via dependency injection.
   */
  public constructor(transport: DownloadTransport) {
    this.transport = transport;
    this.progress = new Map<string, DownloadProgress>();
  }

  /**
   * Downloads, verifies, and persists a model's weights to local disk.
   * Returns the local file path on success. Throws if integrity
   * verification fails.
   */
  public download(manifest: ModelManifest): string {
    this.setProgress(manifest.modelId, DownloadStatus.DOWNLOADING, 0, manifest.diskSizeBytes);

    const data = this.transport.fetchBytes(manifest, (bytesDownloaded) => {
      this.setProgress(manifest.modelId, DownloadStatus.DOWNLOADING, bytesDownloaded, manifest.diskSizeBytes);
    });

    this.setProgress(manifest.modelId, DownloadStatus.VERIFYING, data.length, manifest.diskSizeBytes);

    const verified = this.transport.verifyIntegrity(manifest, data);
    if (!verified) {
      this.setProgress(manifest.modelId, DownloadStatus.FAILED, data.length, manifest.diskSizeBytes);
      throw new Error(`Integrity verification failed for model "${manifest.modelId}".`);
    }

    const path = this.transport.persist(manifest, data);
    this.setProgress(manifest.modelId, DownloadStatus.COMPLETE, manifest.diskSizeBytes, manifest.diskSizeBytes);

    return path;
  }

  /**
   * Marks an in-progress download as cancelled.
   */
  public cancel(modelId: string): void {
    const existing = this.progress.get(modelId);
    if (!existing) {
      throw new Error(`No download in progress for model "${modelId}".`);
    }

    this.progress.set(modelId, {
      modelId,
      status: DownloadStatus.CANCELLED,
      bytesDownloaded: existing.bytesDownloaded,
      totalBytes: existing.totalBytes,
      updatedAt: new Date(),
    });
  }

  /**
   * Returns the current download progress for a model, if tracked.
   */
  public getProgress(modelId: string): DownloadProgress | null {
    return this.progress.get(modelId) ?? null;
  }

  private setProgress(modelId: string, status: DownloadStatus, bytesDownloaded: number, totalBytes: number): void {
    this.progress.set(modelId, {
      modelId,
      status,
      bytesDownloaded,
      totalBytes,
      updatedAt: new Date(),
    });
  }
}