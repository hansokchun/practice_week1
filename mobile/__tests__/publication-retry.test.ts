import { retryPublicationJob } from "../src/publication-retry";

const failedJob = {
  jobId: "33333333-3333-4333-8333-333333333333",
  deviceAssetId: "asset-a",
  status: "failed" as const,
  payload: {
    version: 1 as const,
    intent: "private" as const,
    objectPath: "11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.jpg",
    photoId: "33333333-3333-4333-8333-333333333333"
  },
  attempts: 1,
  nextAttemptAt: 61_000,
  createdAt: 1_000,
  updatedAt: 1_000
};

const derivative = {
  assetId: "asset-a",
  uri: "file:///cache/ikkyee-derivatives/retry.jpg",
  width: 1600,
  height: 1200,
  byteSize: 300_000,
  format: "jpeg" as const,
  metadataPolicy: "stripped" as const,
  createdAt: 2_000,
  expiresAt: 3_602_000
};

describe("explicit publication retry", () => {
  it("reacquires the original, reuses the persisted job, and succeeds without enqueueing", async () => {
    const events: string[] = [];
    const prepare = jest.fn(async () => { events.push("prepare"); return [derivative]; });
    const markRunning = jest.fn(async () => { events.push("running"); return 2; });
    const markSucceeded = jest.fn(async () => { events.push("succeeded"); });
    const removeDerivative = jest.fn(async () => { events.push("cleanup"); });
    const upload = jest.fn(async () => { events.push("upload"); });
    const insertPhoto = jest.fn(async () => { events.push("insert"); });

    const result = await retryPublicationJob({
      ownerId: "11111111-1111-4111-8111-111111111111",
      job: failedJob
    }, {
      now: () => 70_000,
      prepare,
      readBytes: async () => new ArrayBuffer(8),
      removeDerivative,
      remote: { upload, insertPhoto, remove: jest.fn() },
      repository: {
        findOpen: jest.fn(async () => null),
        enqueue: jest.fn(),
        markRunning,
        markSucceeded,
        markFailed: jest.fn()
      }
    });

    expect(prepare).toHaveBeenCalledWith(["asset-a"]);
    expect(events).toEqual(["prepare", "running", "upload", "insert", "succeeded", "cleanup"]);
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({
      path: failedJob.payload.objectPath,
      upsert: false
    }));
    expect(result).toEqual({ succeeded: 1, failed: 0, jobIds: [failedJob.jobId] });
  });

  it("does not consume an attempt when the original cannot be reacquired", async () => {
    const markRunning = jest.fn();
    await expect(retryPublicationJob({
      ownerId: "11111111-1111-4111-8111-111111111111",
      job: failedJob
    }, {
      prepare: async () => { throw new Error("permission revoked"); },
      readBytes: async () => new ArrayBuffer(8),
      removeDerivative: jest.fn(),
      remote: { upload: jest.fn(), insertPhoto: jest.fn(), remove: jest.fn() },
      repository: {
        findOpen: jest.fn(async () => null),
        enqueue: jest.fn(),
        markRunning,
        markSucceeded: jest.fn(),
        markFailed: jest.fn()
      }
    })).rejects.toThrow("원본");
    expect(markRunning).not.toHaveBeenCalled();
  });

  it("rejects an owner-path mismatch before reacquiring or sending data", async () => {
    const prepare = jest.fn();
    await expect(retryPublicationJob({
      ownerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      job: failedJob
    }, {
      prepare,
      readBytes: jest.fn(),
      removeDerivative: jest.fn(),
      remote: { upload: jest.fn(), insertPhoto: jest.fn(), remove: jest.fn() },
      repository: {
        findOpen: jest.fn(async () => null),
        enqueue: jest.fn(),
        markRunning: jest.fn(),
        markSucceeded: jest.fn(),
        markFailed: jest.fn()
      }
    })).rejects.toThrow("재시도");
    expect(prepare).not.toHaveBeenCalled();
  });

  it("reuses the persisted raw token while sending only its hash during link retry", async () => {
    const rawToken = "d".repeat(64);
    const tokenHash = "e".repeat(64);
    const insertPhoto = jest.fn(async () => undefined);
    const job = {
      ...failedJob,
      payload: { ...failedJob.payload, intent: "link" as const, shareToken: rawToken }
    };
    const result = await retryPublicationJob({
      ownerId: "11111111-1111-4111-8111-111111111111",
      job
    }, {
      prepare: async () => [derivative],
      hashShareToken: async () => tokenHash,
      readBytes: async () => new ArrayBuffer(8),
      removeDerivative: async () => undefined,
      remote: { upload: async () => undefined, insertPhoto, remove: async () => undefined },
      repository: {
        findOpen: async () => null,
        enqueue: jest.fn(),
        markRunning: async () => 2,
        markSucceeded: async () => undefined,
        markFailed: async () => undefined
      }
    });

    expect(insertPhoto).toHaveBeenCalledWith(expect.objectContaining({
      visibility: "private",
      link_token_hash: tokenHash
    }));
    expect(JSON.stringify(insertPhoto.mock.calls)).not.toContain(rawToken);
    expect(result).toEqual({ succeeded: 1, failed: 0, jobIds: [job.jobId], shareTokens: [rawToken] });
  });
});
