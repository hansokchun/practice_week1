import type { SQLiteDatabase } from "expo-sqlite";

import { devicePhotoThumbnailCache } from "./device-photo-thumbnail-cache";

type TombstoneQuery = {
  readonly getAllAsync: <T>(source: string) => Promise<T[]>;
};

type ThumbnailRemoval = {
  readonly remove: (assetId: string) => Promise<void>;
};

export async function pruneTombstonedDevicePhotoThumbnails(
  database: TombstoneQuery,
  thumbnailCache: ThumbnailRemoval
): Promise<{ readonly removedThumbnailCount: number }> {
  const tombstones = await database.getAllAsync<{ readonly asset_id: string }>(
    `SELECT asset_id FROM tombstones
     WHERE reason = 'device-original-missing'
     ORDER BY removed_at, asset_id`
  );
  for (const { asset_id: assetId } of tombstones) await thumbnailCache.remove(assetId);
  return { removedThumbnailCount: tombstones.length };
}

export function pruneExpoDevicePhotoThumbnails(
  database: SQLiteDatabase
): Promise<{ readonly removedThumbnailCount: number }> {
  return pruneTombstonedDevicePhotoThumbnails(database, devicePhotoThumbnailCache);
}
