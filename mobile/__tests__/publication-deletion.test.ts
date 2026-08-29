import { deletePublishedPhoto } from "../src/publication-deletion";
import type { PublicationJob } from "../src/publication-job";

const ownerId = "11111111-1111-4111-8111-111111111111";
const photoId = "22222222-2222-4222-8222-222222222222";

function publishedJob(overrides: Partial<PublicationJob> = {}): PublicationJob {
  return {
    jobId: photoId,
    deviceAssetId: "asset-a",
    status: "succeeded",
    payload: {
      version: 1,
      intent: "public",
      objectPath: `${ownerId}/${photoId}.jpg`,
      photoId,
      shareToken: null
    },
    attempts: 1,
    nextAttemptAt: null,
    createdAt: 1_000,
    updatedAt: 2_000,
    ...overrides
  };
}

describe("published photo deletion", () => {
  it("hides the owned row, removes its owned object, then clears local publication state", async () => {
    const calls: string[] = [];
    const result = await deletePublishedPhoto(ownerId, "asset-a", {
      findLatestPublished: async () => publishedJob(),
      deletePhotoRecord: async (id, expectedOwnerId) => {
        calls.push(`record:${id}:${expectedOwnerId}`);
      },
      removeObject: async (path) => { calls.push(`object:${path}`); },
      clearLocalJob: async (jobId) => { calls.push(`local:${jobId}`); }
    });

    expect(result).toEqual({ photoId });
    expect(calls).toEqual([
      `record:${photoId}:${ownerId}`,
      `object:${ownerId}/${photoId}.jpg`,
      `local:${photoId}`
    ]);
  });

  it("keeps local state retryable when remote deletion is incomplete", async () => {
    const clearLocalJob = jest.fn(async () => undefined);
    await expect(deletePublishedPhoto(ownerId, "asset-a", {
      findLatestPublished: async () => publishedJob(),
      deletePhotoRecord: async () => undefined,
      removeObject: async () => { throw new Error("private storage failure"); },
      clearLocalJob
    })).rejects.toThrow("게시 사진을 삭제하지 못했습니다");
    expect(clearLocalJob).not.toHaveBeenCalled();
  });

  it("rejects missing, non-succeeded, or owner-path-tampered jobs before remote access", async () => {
    const deletePhotoRecord = jest.fn(async () => undefined);
    const dependencies = {
      findLatestPublished: async () => null,
      deletePhotoRecord,
      removeObject: async () => undefined,
      clearLocalJob: async () => undefined
    };
    await expect(deletePublishedPhoto(ownerId, "asset-a", dependencies)).rejects.toThrow("삭제할 게시 사진");

    await expect(deletePublishedPhoto(ownerId, "asset-a", {
      ...dependencies,
      findLatestPublished: async () => publishedJob({ status: "failed" })
    })).rejects.toThrow("삭제할 게시 사진");

    await expect(deletePublishedPhoto(ownerId, "asset-a", {
      ...dependencies,
      findLatestPublished: async () => publishedJob({
        payload: { ...publishedJob().payload, objectPath: `33333333-3333-4333-8333-333333333333/${photoId}.jpg` }
      })
    })).rejects.toThrow("삭제할 게시 사진");
    expect(deletePhotoRecord).not.toHaveBeenCalled();
  });
});
