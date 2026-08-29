import type { DevicePhotoPreview } from "./device-photo-library";
import { nativeMediaCapability } from "./native-media-capability";

export type DevicePhotoPageRequest = {
  readonly offset: number;
  readonly limit: number;
};

export type DevicePhotoPageSource = {
  readonly listPhotoPage: (request: DevicePhotoPageRequest) => Promise<readonly DevicePhotoPreview[]>;
};

export type DevicePhotoScanCheckpoint = {
  readonly offset: number;
  readonly lastAssetId: string;
  readonly processedAssetCount: number;
  readonly scanStartedAt: string;
};

export type DevicePhotoScanStore = {
  readonly getCheckpoint: () => Promise<DevicePhotoScanCheckpoint | null>;
  readonly persistPage: (
    photos: readonly DevicePhotoPreview[],
    checkpoint: DevicePhotoScanCheckpoint
  ) => Promise<void>;
  readonly clearCheckpoint: () => Promise<void>;
  readonly completeScan: (scanStartedAt: string) => Promise<number>;
};

export type DevicePhotoScanResult = {
  readonly status: "completed" | "limit-reached";
  readonly processedAssetCount: number;
  readonly removedAssetCount: number;
  readonly restartedForDrift: boolean;
};

export type DevicePhotoScanRequest = {
  readonly source: DevicePhotoPageSource;
  readonly store: DevicePhotoScanStore;
  readonly now?: () => string;
};

function validCheckpoint(checkpoint: DevicePhotoScanCheckpoint): boolean {
  return (
    Number.isInteger(checkpoint.offset) &&
    checkpoint.offset > 0 &&
    Number.isInteger(checkpoint.processedAssetCount) &&
    checkpoint.processedAssetCount === checkpoint.offset &&
    checkpoint.lastAssetId.trim() !== "" &&
    !Number.isNaN(Date.parse(checkpoint.scanStartedAt))
  );
}

async function hasCheckpointDrift(
  source: DevicePhotoPageSource,
  checkpoint: DevicePhotoScanCheckpoint
): Promise<boolean> {
  const boundary = await source.listPhotoPage({ offset: checkpoint.offset - 1, limit: 1 });
  return boundary[0]?.id !== checkpoint.lastAssetId;
}

export async function scanDevicePhotoLibrary({
  source,
  store,
  now = () => new Date().toISOString()
}: DevicePhotoScanRequest): Promise<DevicePhotoScanResult> {
  let checkpoint = await store.getCheckpoint();
  let restartedForDrift = false;

  if (checkpoint !== null && (!validCheckpoint(checkpoint) || await hasCheckpointDrift(source, checkpoint))) {
    await store.clearCheckpoint();
    checkpoint = null;
    restartedForDrift = true;
  }

  const scanStartedAt = checkpoint?.scanStartedAt ?? now();
  let offset = checkpoint?.offset ?? 0;
  let processedAssetCount = checkpoint?.processedAssetCount ?? 0;
  let processedThisRun = 0;
  const { pageSize, maximumAssetsPerRun } = nativeMediaCapability.enumeration;

  while (processedThisRun < maximumAssetsPerRun) {
    const limit = Math.min(pageSize, maximumAssetsPerRun - processedThisRun);
    const page = await source.listPhotoPage({ offset, limit });
    if (page.length === 0) {
      const removedAssetCount = await store.completeScan(scanStartedAt);
      return { status: "completed", processedAssetCount, removedAssetCount, restartedForDrift };
    }

    offset += page.length;
    processedAssetCount += page.length;
    processedThisRun += page.length;
    const nextCheckpoint: DevicePhotoScanCheckpoint = {
      offset,
      lastAssetId: page.at(-1)?.id ?? "",
      processedAssetCount,
      scanStartedAt
    };
    await store.persistPage(page, nextCheckpoint);

    if (page.length < limit) {
      const removedAssetCount = await store.completeScan(scanStartedAt);
      return { status: "completed", processedAssetCount, removedAssetCount, restartedForDrift };
    }
  }

  return {
    status: "limit-reached",
    processedAssetCount,
    removedAssetCount: 0,
    restartedForDrift
  };
}
