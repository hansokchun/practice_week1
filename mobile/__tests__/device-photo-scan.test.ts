import {
  scanDevicePhotoLibrary,
  type DevicePhotoScanCheckpoint,
  type DevicePhotoScanStore
} from "../src/device-photo-scan";
import type { DevicePhotoPreview } from "../src/device-photo-library";

function asset(index: number): DevicePhotoPreview {
  return {
    id: `asset-${index}`,
    filename: `photo-${index}.jpg`,
    width: 1200,
    height: 1500,
    creationTime: 1_700_000_000_000 + index,
    modificationTime: 1_700_000_000_000 + index
  };
}

function createMemoryStore(initialCheckpoint: DevicePhotoScanCheckpoint | null = null) {
  let checkpoint = initialCheckpoint;
  const persisted: DevicePhotoPreview[] = [];
  let completedAt: string | null = null;
  let clearCount = 0;
  const store: DevicePhotoScanStore = {
    getCheckpoint: jest.fn(async () => checkpoint),
    persistPage: jest.fn(async (photos, nextCheckpoint) => {
      persisted.push(...photos);
      checkpoint = nextCheckpoint;
    }),
    clearCheckpoint: jest.fn(async () => {
      clearCount += 1;
      checkpoint = null;
    }),
    completeScan: jest.fn(async (scanStartedAt) => {
      completedAt = scanStartedAt;
      checkpoint = null;
      return 0;
    })
  };
  return {
    store,
    persisted,
    getCheckpoint: () => checkpoint,
    getCompletedAt: () => completedAt,
    getClearCount: () => clearCount
  };
}

describe("device photo incremental scan", () => {
  it("reads photo metadata in bounded pages and completes reconciliation", async () => {
    const photos = Array.from({ length: 600 }, (_, index) => asset(index));
    const requestedPages: Array<{ offset: number; limit: number }> = [];
    const source = {
      listPhotoPage: jest.fn(async ({ offset, limit }: { offset: number; limit: number }) => {
        requestedPages.push({ offset, limit });
        return photos.slice(offset, offset + limit);
      })
    };
    const memory = createMemoryStore();

    await expect(scanDevicePhotoLibrary({
      source,
      store: memory.store,
      now: () => "2026-08-24T10:00:00.000Z"
    })).resolves.toEqual({
      status: "completed",
      processedAssetCount: 600,
      removedAssetCount: 0,
      restartedForDrift: false
    });

    expect(requestedPages).toEqual([
      { offset: 0, limit: 250 },
      { offset: 250, limit: 250 },
      { offset: 500, limit: 250 }
    ]);
    expect(memory.persisted).toHaveLength(600);
    expect(memory.getCompletedAt()).toBe("2026-08-24T10:00:00.000Z");
  });

  it("resumes only after validating the saved offset boundary", async () => {
    const photos = Array.from({ length: 300 }, (_, index) => asset(index));
    const memory = createMemoryStore({
      offset: 250,
      lastAssetId: "asset-249",
      processedAssetCount: 250,
      scanStartedAt: "2026-08-24T09:00:00.000Z"
    });
    const source = {
      listPhotoPage: jest.fn(async ({ offset, limit }: { offset: number; limit: number }) => photos.slice(offset, offset + limit))
    };

    const result = await scanDevicePhotoLibrary({ source, store: memory.store });

    expect(result).toMatchObject({ status: "completed", processedAssetCount: 300, restartedForDrift: false });
    expect(source.listPhotoPage.mock.calls.map(([request]) => request)).toEqual([
      { offset: 249, limit: 1 },
      { offset: 250, limit: 250 }
    ]);
  });

  it("restarts safely when the mutable library invalidates the saved offset", async () => {
    const shiftedPhotos = [asset(999), ...Array.from({ length: 30 }, (_, index) => asset(index))];
    const memory = createMemoryStore({
      offset: 20,
      lastAssetId: "asset-19",
      processedAssetCount: 20,
      scanStartedAt: "2026-08-24T09:00:00.000Z"
    });
    const source = {
      listPhotoPage: jest.fn(async ({ offset, limit }: { offset: number; limit: number }) => shiftedPhotos.slice(offset, offset + limit))
    };

    const result = await scanDevicePhotoLibrary({
      source,
      store: memory.store,
      now: () => "2026-08-24T10:00:00.000Z"
    });

    expect(result).toMatchObject({ status: "completed", processedAssetCount: 31, restartedForDrift: true });
    expect(memory.getClearCount()).toBe(1);
    expect(source.listPhotoPage).toHaveBeenLastCalledWith({ offset: 0, limit: 250 });
  });

  it("stops at the ten-thousand asset run budget and keeps a resumable checkpoint", async () => {
    const photos = Array.from({ length: 10_250 }, (_, index) => asset(index));
    const memory = createMemoryStore();
    const source = {
      listPhotoPage: jest.fn(async ({ offset, limit }: { offset: number; limit: number }) => photos.slice(offset, offset + limit))
    };

    const result = await scanDevicePhotoLibrary({ source, store: memory.store });

    expect(result).toMatchObject({ status: "limit-reached", processedAssetCount: 10_000, restartedForDrift: false });
    expect(memory.getCompletedAt()).toBeNull();
    expect(memory.getCheckpoint()).toMatchObject({ offset: 10_000, lastAssetId: "asset-9999", processedAssetCount: 10_000 });
  });
});
