import { Platform } from "react-native";
import type { SQLiteDatabase } from "expo-sqlite";

import {
  readSafeDevicePhotoMetadata,
  type DevicePhotoMetadataAsset,
  type DevicePhotoPlatform,
  type SafeDevicePhotoMetadata
} from "./device-photo-metadata";
import {
  createExpoSQLiteDevicePhotoMetadataRepository,
  type DevicePhotoMetadataRepository
} from "./device-photo-repository";

export type DevicePhotoMetadataSource = {
  readonly read: (assetId: string) => Promise<SafeDevicePhotoMetadata>;
};

export type DevicePhotoMetadataEnrichmentResult = {
  readonly processedAssetCount: number;
};

const METADATA_ASSETS_PER_RUN = 60;

export async function enrichPendingDevicePhotoMetadata(
  repository: DevicePhotoMetadataRepository,
  source: DevicePhotoMetadataSource,
  limit = METADATA_ASSETS_PER_RUN
): Promise<DevicePhotoMetadataEnrichmentResult> {
  const assetIds = await repository.getPendingAssetIds(limit);
  for (const assetId of assetIds) {
    await repository.saveMetadata(assetId, await source.read(assetId));
  }
  return { processedAssetCount: assetIds.length };
}

export function createExpoDevicePhotoMetadataSource(
  platform: DevicePhotoPlatform
): DevicePhotoMetadataSource {
  return {
    async read(assetId) {
      const { Asset } = await import("expo-media-library");
      const asset = new Asset(assetId) as DevicePhotoMetadataAsset;
      return readSafeDevicePhotoMetadata(asset, platform);
    }
  };
}

export async function enrichExpoDevicePhotoMetadata(
  database: SQLiteDatabase
): Promise<DevicePhotoMetadataEnrichmentResult> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return { processedAssetCount: 0 };
  }
  return enrichPendingDevicePhotoMetadata(
    createExpoSQLiteDevicePhotoMetadataRepository(database),
    createExpoDevicePhotoMetadataSource(Platform.OS)
  );
}
