import type {
  EnqueuePublicationJob,
  PublicationJob,
  PublicationJobPayload,
  PublicationJobRepository,
  PublicationJobStatus
} from "./publication-job";
import { publicationIntents } from "./publication-selection";
import { isPublicationShareToken } from "./publication-link-token";

type SqlValue = string | number | null;

interface PublicationJobSqlExecutor {
  readonly runAsync: (source: string, params?: readonly SqlValue[]) => Promise<{ readonly changes: number }>;
  readonly getFirstAsync: <T>(source: string, params?: readonly SqlValue[]) => Promise<T | null>;
  readonly getAllAsync: <T>(source: string, params?: readonly SqlValue[]) => Promise<T[]>;
}

export async function recoverInterruptedPublicationJobs(
  database: PublicationJobSqlExecutor,
  updatedAt = Date.now()
): Promise<number> {
  return createPublicationJobRepository(database).recoverInterrupted(updatedAt);
}

let startupRecovery: Promise<number> | null = null;

export function recoverInterruptedPublicationJobsOnce(
  database: PublicationJobSqlExecutor,
  updatedAt = Date.now()
): Promise<number> {
  if (startupRecovery === null) {
    startupRecovery = recoverInterruptedPublicationJobs(database, updatedAt).catch((cause) => {
      startupRecovery = null;
      throw cause;
    });
  }
  return startupRecovery;
}

type PublicationJobRow = {
  readonly job_id: string;
  readonly device_asset_id: string | null;
  readonly status: PublicationJobStatus;
  readonly payload_json: string;
  readonly attempts: number;
  readonly next_attempt_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

const RETRY_DELAYS_MS = [60_000, 5 * 60_000] as const;

function parseTimestamp(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePayload(value: string): PublicationJobPayload {
  const candidate: unknown = JSON.parse(value);
  if (typeof candidate !== "object" || candidate === null) throw new TypeError("Invalid publication job payload");
  const row = candidate as Record<string, unknown>;
  if (
    row["version"] !== 1 ||
    typeof row["intent"] !== "string" ||
    !publicationIntents.includes(row["intent"] as PublicationJobPayload["intent"]) ||
    typeof row["objectPath"] !== "string" ||
    typeof row["photoId"] !== "string" ||
    !(row["shareToken"] === undefined || row["shareToken"] === null || isPublicationShareToken(row["shareToken"]))
  ) throw new TypeError("Invalid publication job payload");
  return {
    version: 1,
    intent: row["intent"] as PublicationJobPayload["intent"],
    objectPath: row["objectPath"],
    photoId: row["photoId"],
    shareToken: row["shareToken"] === undefined ? null : row["shareToken"] as string | null
  };
}

function toJob(row: PublicationJobRow): PublicationJob {
  const createdAt = parseTimestamp(row.created_at);
  const updatedAt = parseTimestamp(row.updated_at);
  if (row.device_asset_id === null || createdAt === null || updatedAt === null) {
    throw new TypeError("Invalid publication job row");
  }
  return {
    jobId: row.job_id,
    deviceAssetId: row.device_asset_id,
    status: row.status,
    payload: parsePayload(row.payload_json),
    attempts: row.attempts,
    nextAttemptAt: parseTimestamp(row.next_attempt_at),
    createdAt,
    updatedAt
  };
}

export function createPublicationJobRepository(database: PublicationJobSqlExecutor): PublicationJobRepository & {
  readonly get: (jobId: string) => Promise<PublicationJob | null>;
  readonly listRetryable: (now: number, limit?: number) => Promise<readonly PublicationJob[]>;
  readonly getLatestRetryableForAsset: (assetId: string) => Promise<PublicationJob | null>;
  readonly getLatestSucceededForAsset: (assetId: string) => Promise<PublicationJob | null>;
  readonly deleteSucceeded: (jobId: string) => Promise<void>;
  readonly recoverInterrupted: (updatedAt: number) => Promise<number>;
} {
  async function get(jobId: string): Promise<PublicationJob | null> {
    const row = await database.getFirstAsync<PublicationJobRow>(
      `SELECT job_id, device_asset_id, status, payload_json, attempts,
              next_attempt_at, created_at, updated_at
       FROM publication_jobs WHERE job_id = ?`,
      [jobId]
    );
    return row === null ? null : toJob(row);
  }

  return {
    get,
    async findOpen(deviceAssetId, intent) {
      const row = await database.getFirstAsync<PublicationJobRow>(
        `SELECT job_id, device_asset_id, status, payload_json, attempts,
                next_attempt_at, created_at, updated_at
         FROM publication_jobs
         WHERE device_asset_id = ?
           AND json_extract(payload_json, '$.intent') = ?
           AND (status IN ('pending', 'running') OR (status = 'failed' AND attempts < 3))
         ORDER BY CAST(updated_at AS INTEGER) DESC, job_id DESC
         LIMIT 1`,
        [deviceAssetId, intent]
      );
      return row === null ? null : toJob(row);
    },
    async recoverInterrupted(updatedAt) {
      const result = await database.runAsync(
        `UPDATE publication_jobs
         SET status = 'failed',
             next_attempt_at = CASE
               WHEN attempts >= 3 THEN NULL
               WHEN attempts <= 1 THEN ?
               ELSE ?
             END,
             updated_at = ?
         WHERE status = 'running'`,
        [String(updatedAt + RETRY_DELAYS_MS[0]), String(updatedAt + RETRY_DELAYS_MS[1]), String(updatedAt)]
      );
      return result.changes;
    },
    async getLatestRetryableForAsset(assetId) {
      if (assetId.trim() === "") return null;
      const row = await database.getFirstAsync<PublicationJobRow>(
        `SELECT job_id, device_asset_id, status, payload_json, attempts,
                next_attempt_at, created_at, updated_at
         FROM publication_jobs
         WHERE device_asset_id = ? AND status = 'failed' AND attempts < 3
         ORDER BY CAST(updated_at AS INTEGER) DESC, job_id DESC
         LIMIT 1`,
        [assetId]
      );
      return row === null ? null : toJob(row);
    },
    async getLatestSucceededForAsset(assetId) {
      if (assetId.trim() === "") return null;
      const row = await database.getFirstAsync<PublicationJobRow>(
        `SELECT job_id, device_asset_id, status, payload_json, attempts,
                next_attempt_at, created_at, updated_at
         FROM publication_jobs
         WHERE device_asset_id = ? AND status = 'succeeded'
         ORDER BY CAST(updated_at AS INTEGER) DESC, job_id DESC
         LIMIT 1`,
        [assetId]
      );
      return row === null ? null : toJob(row);
    },
    async deleteSucceeded(jobId) {
      await database.runAsync(
        "DELETE FROM publication_jobs WHERE job_id = ? AND status = 'succeeded'",
        [jobId]
      );
    },
    async listRetryable(now, limit = 20) {
      const boundedLimit = Number.isInteger(limit) ? Math.min(20, Math.max(1, limit)) : 20;
      const rows = await database.getAllAsync<PublicationJobRow>(
        `SELECT job_id, device_asset_id, status, payload_json, attempts,
                next_attempt_at, created_at, updated_at
         FROM publication_jobs
         WHERE status = 'failed' AND attempts < 3 AND next_attempt_at IS NOT NULL
           AND CAST(next_attempt_at AS INTEGER) <= ?
         ORDER BY CAST(next_attempt_at AS INTEGER), created_at, job_id
         LIMIT ?`,
        [now, boundedLimit]
      );
      return rows.map(toJob);
    },
    async enqueue(input: EnqueuePublicationJob) {
      const payload: PublicationJobPayload = {
        version: 1,
        intent: input.intent,
        objectPath: input.objectPath,
        photoId: input.photoId,
        shareToken: input.shareToken ?? null
      };
      await database.runAsync(
        `INSERT INTO publication_jobs(
          job_id, device_asset_id, status, payload_json, attempts,
          next_attempt_at, created_at, updated_at
        ) VALUES (?, ?, 'pending', ?, 0, NULL, ?, ?)`,
        [input.jobId, input.deviceAssetId, JSON.stringify(payload), String(input.createdAt), String(input.createdAt)]
      );
      const job = await get(input.jobId);
      if (job === null) throw new Error("Publication job was not persisted");
      return job;
    },
    async markRunning(jobId, updatedAt) {
      await database.runAsync(
        `UPDATE publication_jobs SET status = 'running', attempts = attempts + 1,
          next_attempt_at = NULL, updated_at = ? WHERE job_id = ?`,
        [String(updatedAt), jobId]
      );
      const job = await get(jobId);
      if (job === null) throw new Error("Publication job was not found");
      return job.attempts;
    },
    async markSucceeded(jobId, updatedAt) {
      await database.runAsync(
        "UPDATE publication_jobs SET status = 'succeeded', next_attempt_at = NULL, updated_at = ? WHERE job_id = ?",
        [String(updatedAt), jobId]
      );
    },
    async markFailed(jobId, attempts, updatedAt) {
      const delay = RETRY_DELAYS_MS[attempts - 1];
      const nextAttemptAt = attempts >= 3 || delay === undefined ? null : String(updatedAt + delay);
      await database.runAsync(
        "UPDATE publication_jobs SET status = 'failed', next_attempt_at = ?, updated_at = ? WHERE job_id = ?",
        [nextAttemptAt, String(updatedAt), jobId]
      );
    }
  };
}
