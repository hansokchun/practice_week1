import { clearLocalAccountData } from "../src/account-local-cleanup";
import { bootstrapAuthSession } from "../src/email-auth";
import { resolvePhotoLibraryPermission, type DevicePhotoPreview } from "../src/device-photo-library";
import { scanDevicePhotoLibrary, type DevicePhotoScanCheckpoint } from "../src/device-photo-scan";
import { fetchExplorePhotoPage } from "../src/explore-photo-repository";
import { fetchLikedPhotos, setPhotoLiked } from "../src/liked-photo-repository";
import type { PublicationJob, PublicationJobRepository } from "../src/publication-job";
import { publishPreparedSelection } from "../src/publication-publisher";
import { createPublicationReviewParams, parsePublicationReviewParams } from "../src/publication-selection";

test("authenticated photo journey crosses permission, scan, publish, Explore, likes, and local cleanup boundaries", async () => {
  const ownerId = "11111111-1111-4111-8111-111111111111";
  const photoId = "22222222-2222-4222-8222-222222222222";
  const now = Date.parse("2026-08-25T12:00:00.000Z");
  const session = await bootstrapAuthSession({
    getSession: async () => ({ data: { session: { access_token: "redacted" } }, error: null }),
    getUser: async () => ({ data: { user: { id: ownerId } }, error: null })
  });
  expect(session).toEqual({ status: "signed_in", user: { id: ownerId } });

  const permission = resolvePhotoLibraryPermission("none", {
    accessPrivileges: "all",
    canAskAgain: true,
    granted: true
  });
  expect(permission).toMatchObject({
    state: "full",
    nextAction: "enumerate-all",
    canAskAgain: true
  });

  const devicePhotos: DevicePhotoPreview[] = [
    { id: "device-a", filename: "a.heic", width: 4032, height: 3024, creationTime: now },
    { id: "device-b", filename: "b.jpg", width: 3024, height: 4032, creationTime: now - 1_000 }
  ];
  const indexed = new Map<string, DevicePhotoPreview>();
  let checkpoint: DevicePhotoScanCheckpoint | null = null;
  const scan = await scanDevicePhotoLibrary({
    now: () => new Date(now).toISOString(),
    source: {
      listPhotoPage: async ({ offset, limit }) => devicePhotos.slice(offset, offset + limit)
    },
    store: {
      getCheckpoint: async () => checkpoint,
      persistPage: async (photos, nextCheckpoint) => {
        photos.forEach((photo) => indexed.set(photo.id, photo));
        checkpoint = nextCheckpoint;
      },
      clearCheckpoint: async () => { checkpoint = null; },
      completeScan: async () => { checkpoint = null; return 0; }
    }
  });
  expect(scan).toEqual({
    status: "completed",
    processedAssetCount: 2,
    removedAssetCount: 0,
    restartedForDrift: false
  });
  expect([...indexed.keys()]).toEqual(["device-a", "device-b"]);

  const reviewParams = createPublicationReviewParams("public", ["device-a"]);
  const selection = parsePublicationReviewParams(reviewParams);
  expect(selection).toEqual({ intent: "public", assetIds: ["device-a"] });
  if (selection === null) throw new Error("integration selection must be valid");

  const jobs = new Map<string, PublicationJob>();
  const repository: PublicationJobRepository = {
    findOpen: async () => null,
    enqueue: async (input) => {
      const job: PublicationJob = {
        jobId: input.jobId,
        deviceAssetId: input.deviceAssetId,
        status: "pending",
        payload: {
          version: 1,
          intent: input.intent,
          objectPath: input.objectPath,
          photoId: input.photoId,
          shareToken: input.shareToken ?? null
        },
        attempts: 0,
        nextAttemptAt: null,
        createdAt: input.createdAt,
        updatedAt: input.createdAt
      };
      jobs.set(job.jobId, job);
      return job;
    },
    markRunning: async (jobId, updatedAt) => {
      const job = jobs.get(jobId);
      if (!job) throw new Error("missing integration job");
      jobs.set(jobId, { ...job, attempts: 1, status: "running", updatedAt });
      return 1;
    },
    markSucceeded: async (jobId, updatedAt) => {
      const job = jobs.get(jobId);
      if (!job) throw new Error("missing integration job");
      jobs.set(jobId, { ...job, status: "succeeded", updatedAt });
    },
    markFailed: async (jobId, attempts, updatedAt) => {
      const job = jobs.get(jobId);
      if (!job) throw new Error("missing integration job");
      jobs.set(jobId, { ...job, attempts, status: "failed", updatedAt });
    }
  };
  const publishedRows: Array<Record<string, unknown>> = [];
  const removedDerivatives: string[] = [];
  const result = await publishPreparedSelection({
    ownerId,
    selection,
    derivatives: [{
      assetId: "device-a",
      uri: "file:///cache/publish/device-a.jpg",
      width: 2048,
      height: 1536,
      byteSize: 600_000,
      format: "jpeg",
      metadataPolicy: "stripped",
      createdAt: now,
      expiresAt: now + 60 * 60 * 1_000
    }]
  }, {
    repository,
    createId: () => photoId,
    now: () => now,
    readBytes: async () => new Uint8Array([1, 2, 3]).buffer,
    removeDerivative: async (uri) => { removedDerivatives.push(uri); },
    remote: {
      upload: async ({ path, contentType, upsert }) => {
        expect({ path, contentType, upsert }).toEqual({
          path: `${ownerId}/${photoId}.jpg`, contentType: "image/jpeg", upsert: false
        });
      },
      insertPhoto: async (photo) => {
        publishedRows.push({
          ...photo,
          created_at: new Date(now).toISOString(),
          liked: 0,
          lat: 37.55,
          lng: 126.98,
          location_precision: "approximate"
        });
      },
      remove: async () => undefined
    }
  });
  expect(result).toEqual({ succeeded: 1, failed: 0, jobIds: [photoId] });
  expect(jobs.get(photoId)?.status).toBe("succeeded");
  expect(removedDerivatives).toEqual(["file:///cache/publish/device-a.jpg"]);

  const signedUrl = `https://images.example.invalid/${photoId}`;
  const explore = await fetchExplorePhotoPage({
    bounds: { north: 38, south: 37, east: 128, west: 126 }, offset: 0, pageSize: 20
  }, {
    fetchRows: async () => ({ rows: publishedRows, error: null }),
    signPaths: async (paths, expiresIn) => ({
      urls: new Map([[String(paths[0]), signedUrl]]),
      error: expiresIn === 300 ? null : new Error("unexpected expiry")
    })
  });
  expect(explore.photos).toHaveLength(1);
  expect(explore.photos[0]).toMatchObject({ id: photoId, ownerId, imageUrl: signedUrl });

  const likeCount = await setPhotoLiked(photoId, true, async (name, parameters) => {
    expect({ name, parameters }).toEqual({
      name: "set_photo_like",
      parameters: { target_photo_id: photoId, should_like: true }
    });
    publishedRows[0] = { ...publishedRows[0], liked: 1 };
    return { data: 1, error: null };
  });
  expect(likeCount).toBe(1);

  const liked = await fetchLikedPhotos(undefined, {
    fetchLikedIds: async () => ({ ids: [photoId], error: null }),
    fetchPublicPhotos: async () => ({ rows: publishedRows, error: null }),
    signPaths: async (paths) => ({ urls: new Map([[String(paths[0]), signedUrl]]), error: null })
  });
  expect(liked).toEqual([expect.objectContaining({ id: photoId, imageUrl: signedUrl })]);

  let cleanupSql = "";
  let databaseClosed = false;
  let thumbnailsCleared = false;
  let derivativesCleared = false;
  await clearLocalAccountData({
    openDatabase: async () => ({
      exec: async (sql) => { cleanupSql += sql; },
      close: async () => { databaseClosed = true; }
    }),
    clearThumbnails: async () => { thumbnailsCleared = true; },
    clearDerivatives: async () => { derivativesCleared = true; }
  });
  expect(cleanupSql).toContain("DELETE FROM device_assets");
  expect(cleanupSql).not.toMatch(/MediaLibrary|original/i);
  expect({ databaseClosed, thumbnailsCleared, derivativesCleared }).toEqual({
    databaseClosed: true, thumbnailsCleared: true, derivativesCleared: true
  });
});
