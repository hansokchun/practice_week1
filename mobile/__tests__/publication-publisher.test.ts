import { publishPreparedSelection } from "../src/publication-publisher";

const derivative = {
  assetId: "asset-a",
  uri: "file:///cache/ikkyee-derivatives/a.jpg",
  width: 1600,
  height: 1200,
  byteSize: 300_000,
  format: "jpeg" as const,
  metadataPolicy: "stripped" as const,
  createdAt: 1_000,
  expiresAt: 3_601_000
};

describe("confirmed publication execution", () => {
  it("persists a local job before insert-only Storage upload and owner-scoped photo insert", async () => {
    const events: string[] = [];
    const repository = {
      findOpen: jest.fn(async () => null),
      enqueue: jest.fn(async (input) => {
        events.push("enqueue");
        return {
          jobId: input.jobId,
          deviceAssetId: input.deviceAssetId,
          status: "pending" as const,
          payload: { version: 1 as const, intent: input.intent, objectPath: input.objectPath, photoId: input.photoId },
          attempts: 0,
          nextAttemptAt: null,
          createdAt: input.createdAt,
          updatedAt: input.createdAt
        };
      }),
      markRunning: jest.fn(async () => { events.push("running"); return 1; }),
      markSucceeded: jest.fn(async () => { events.push("succeeded"); }),
      markFailed: jest.fn(async () => { events.push("failed"); })
    };
    const remote = {
      upload: jest.fn(async () => { events.push("upload"); }),
      insertPhoto: jest.fn(async () => { events.push("insert"); }),
      remove: jest.fn(async () => undefined)
    };
    const removeDerivative = jest.fn(async () => { events.push("cleanup"); });

    const result = await publishPreparedSelection({
      ownerId: "11111111-1111-4111-8111-111111111111",
      selection: { intent: "public", assetIds: ["asset-a"] },
      derivatives: [derivative]
    }, {
      createId: () => "22222222-2222-4222-8222-222222222222",
      now: () => 10_000,
      readBytes: async () => new ArrayBuffer(8),
      removeDerivative,
      remote,
      repository
    });

    expect(events).toEqual(["enqueue", "running", "upload", "insert", "succeeded", "cleanup"]);
    expect(remote.upload).toHaveBeenCalledWith({
      bytes: expect.any(ArrayBuffer),
      contentType: "image/jpeg",
      path: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg",
      upsert: false
    });
    expect(remote.insertPhoto).toHaveBeenCalledWith(expect.objectContaining({
      id: "22222222-2222-4222-8222-222222222222",
      owner_id: "11111111-1111-4111-8111-111111111111",
      visibility: "public",
      shared: true,
      storage_path: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg",
      lat: null,
      lng: null,
      location_precision: "hidden"
    }));
    expect(result).toEqual({ succeeded: 1, failed: 0, jobIds: ["22222222-2222-4222-8222-222222222222"] });
  });

  it("records a retryable failure and removes an uploaded object when database insert fails", async () => {
    const markFailed = jest.fn(async () => undefined);
    const remove = jest.fn(async () => undefined);
    const removeDerivative = jest.fn(async () => undefined);
    const result = await publishPreparedSelection({
      ownerId: "11111111-1111-4111-8111-111111111111",
      selection: { intent: "private", assetIds: ["asset-a"] },
      derivatives: [derivative]
    }, {
      createId: () => "33333333-3333-4333-8333-333333333333",
      now: () => 20_000,
      readBytes: async () => new ArrayBuffer(8),
      removeDerivative,
      remote: {
        upload: async () => undefined,
        insertPhoto: async () => { throw new Error("db unavailable"); },
        remove
      },
      repository: {
        findOpen: async () => null,
        enqueue: async (input) => ({
          jobId: input.jobId,
          deviceAssetId: input.deviceAssetId,
          status: "pending" as const,
          payload: { version: 1 as const, intent: input.intent, objectPath: input.objectPath, photoId: input.photoId },
          attempts: 0,
          nextAttemptAt: null,
          createdAt: input.createdAt,
          updatedAt: input.createdAt
        }),
        markRunning: async () => 1,
        markSucceeded: async () => undefined,
        markFailed
      }
    });

    expect(remove).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.jpg");
    expect(markFailed).toHaveBeenCalledWith("33333333-3333-4333-8333-333333333333", 1, 20_000);
    expect(removeDerivative).toHaveBeenCalledWith(derivative.uri);
    expect(result).toEqual({ succeeded: 0, failed: 1, jobIds: ["33333333-3333-4333-8333-333333333333"] });
  });

  it("stores a raw link token locally but sends only its hash on a private photo row", async () => {
    const rawToken = "b".repeat(64);
    const tokenHash = "c".repeat(64);
    const enqueue = jest.fn(async (input) => ({
      jobId: input.jobId,
      deviceAssetId: input.deviceAssetId,
      status: "pending" as const,
      payload: {
        version: 1 as const,
        intent: input.intent,
        objectPath: input.objectPath,
        photoId: input.photoId,
        shareToken: input.shareToken
      },
      attempts: 0,
      nextAttemptAt: null,
      createdAt: input.createdAt,
      updatedAt: input.createdAt
    }));
    const upload = jest.fn();
    const removeDerivative = jest.fn(async () => undefined);
    const insertPhoto = jest.fn();
    const result = await publishPreparedSelection({
      ownerId: "11111111-1111-4111-8111-111111111111",
      selection: { intent: "link", assetIds: ["asset-a"] },
      derivatives: [derivative]
    }, {
      createId: () => "44444444-4444-4444-8444-444444444444",
      createShareToken: async () => rawToken,
      hashShareToken: async () => tokenHash,
      now: () => 1_000,
      readBytes: async () => new ArrayBuffer(8),
      removeDerivative,
      remote: { upload, insertPhoto, remove: jest.fn() },
      repository: {
        findOpen: jest.fn(async () => null),
        enqueue,
        markRunning: jest.fn(async () => 1),
        markSucceeded: jest.fn(async () => undefined),
        markFailed: jest.fn()
      }
    });
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ shareToken: rawToken }));
    expect(upload).toHaveBeenCalledTimes(1);
    expect(insertPhoto).toHaveBeenCalledWith(expect.objectContaining({
      visibility: "private",
      shared: false,
      link_token_hash: tokenHash,
      link_token_created_at: new Date(1_000).toISOString()
    }));
    expect(JSON.stringify(insertPhoto.mock.calls)).not.toContain(rawToken);
    expect(removeDerivative).toHaveBeenCalledWith(derivative.uri);
    expect(result).toEqual({
      succeeded: 1,
      failed: 0,
      jobIds: ["44444444-4444-4444-8444-444444444444"],
      shareTokens: [rawToken]
    });
  });

  it("preflights duplicate work before uploading any item", async () => {
    const removeDerivative = jest.fn(async () => undefined);
    const upload = jest.fn();
    await expect(publishPreparedSelection({
      ownerId: "11111111-1111-4111-8111-111111111111",
      selection: { intent: "private", assetIds: ["asset-a"] },
      derivatives: [derivative]
    }, {
      createId: jest.fn(),
      readBytes: jest.fn(),
      removeDerivative,
      remote: { upload, insertPhoto: jest.fn(), remove: jest.fn() },
      repository: {
        findOpen: async () => ({
          jobId: "existing", deviceAssetId: "asset-a", status: "failed", attempts: 1,
          nextAttemptAt: 1, createdAt: 1, updatedAt: 1,
          payload: { version: 1, intent: "private", objectPath: "owner/existing.jpg", photoId: "existing" }
        }),
        enqueue: jest.fn(), markRunning: jest.fn(), markSucceeded: jest.fn(), markFailed: jest.fn()
      }
    })).rejects.toThrow("진행 중");
    expect(upload).not.toHaveBeenCalled();
    expect(removeDerivative).toHaveBeenCalledWith(derivative.uri);
  });

  it("continues a batch after one item fails and reports the partial result", async () => {
    const secondDerivative = { ...derivative, assetId: "asset-b", uri: "file:///cache/ikkyee-derivatives/b.jpg" };
    const ids = ["22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"];
    let uploadCount = 0;
    const result = await publishPreparedSelection({
      ownerId: "11111111-1111-4111-8111-111111111111",
      selection: { intent: "public", assetIds: ["asset-a", "asset-b"] },
      derivatives: [derivative, secondDerivative]
    }, {
      createId: () => ids.shift()!,
      now: () => 1_000,
      readBytes: async () => new ArrayBuffer(8),
      removeDerivative: async () => undefined,
      remote: {
        upload: async () => { uploadCount += 1; if (uploadCount === 1) throw new Error("offline"); },
        insertPhoto: async () => undefined,
        remove: async () => undefined
      },
      repository: {
        findOpen: async () => null,
        enqueue: async (input) => ({
          jobId: input.jobId, deviceAssetId: input.deviceAssetId, status: "pending", attempts: 0,
          nextAttemptAt: null, createdAt: input.createdAt, updatedAt: input.createdAt,
          payload: { version: 1, intent: input.intent, objectPath: input.objectPath, photoId: input.photoId }
        }),
        markRunning: async () => 1,
        markSucceeded: async () => undefined,
        markFailed: async () => undefined
      }
    });
    expect(result).toEqual({
      succeeded: 1,
      failed: 1,
      jobIds: ["22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"]
    });
  });
});
