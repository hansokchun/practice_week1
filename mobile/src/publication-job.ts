import type { PublicationIntent } from "./publication-selection";

export type PublicationJobStatus = "pending" | "running" | "succeeded" | "failed";

export type PublicationJobPayload = {
  readonly version: 1;
  readonly intent: PublicationIntent;
  readonly objectPath: string;
  readonly photoId: string;
  readonly shareToken?: string | null;
};

export type PublicationJob = {
  readonly jobId: string;
  readonly deviceAssetId: string;
  readonly status: PublicationJobStatus;
  readonly payload: PublicationJobPayload;
  readonly attempts: number;
  readonly nextAttemptAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type EnqueuePublicationJob = {
  readonly jobId: string;
  readonly deviceAssetId: string;
  readonly intent: PublicationIntent;
  readonly objectPath: string;
  readonly photoId: string;
  readonly shareToken?: string | null;
  readonly createdAt: number;
};

export interface PublicationJobRepository {
  readonly findOpen: (deviceAssetId: string, intent: PublicationIntent) => Promise<PublicationJob | null>;
  readonly enqueue: (input: EnqueuePublicationJob) => Promise<PublicationJob>;
  readonly markRunning: (jobId: string, updatedAt: number) => Promise<number>;
  readonly markSucceeded: (jobId: string, updatedAt: number) => Promise<void>;
  readonly markFailed: (jobId: string, attempts: number, updatedAt: number) => Promise<void>;
}
