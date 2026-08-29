import type { DevicePhotoPreview } from "./device-photo-library";
import type { SafeDevicePhotoMetadata } from "./device-photo-metadata";
import type { DevicePhotoScanCheckpoint, DevicePhotoScanStore } from "./device-photo-scan";
import {
  isValidPrivateDevicePhotoLocation,
  type PrivateDevicePhotoLocation
} from "./device-photo-location";
import type { SQLiteDatabase } from "expo-sqlite";

type SqlValue = string | number | null;

export type DevicePhotoSqlExecutor = {
  readonly runAsync: (source: string, params: SqlValue[]) => Promise<unknown>;
  readonly getFirstAsync: <T>(source: string, params?: SqlValue[]) => Promise<T | null>;
  readonly getAllAsync: <T>(source: string, params?: SqlValue[]) => Promise<T[]>;
};

export type DevicePhotoSqlDatabase = DevicePhotoSqlExecutor & {
  readonly withExclusiveTransactionAsync: (
    task: (transaction: DevicePhotoSqlExecutor) => Promise<void>
  ) => Promise<void>;
};

type CheckpointRow = {
  readonly cursor: string | null;
  readonly last_asset_id: string | null;
  readonly processed_asset_count: number;
};

type DevicePhotoGridRow = {
  readonly asset_id: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly created_at: string | null;
  readonly modified_at: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
};

type DevicePhotoDetailRow = DevicePhotoGridRow & {
  readonly media_type: "photo" | "video" | "live_photo";
  readonly publication_status: "pending" | "running" | "succeeded" | "failed" | null;
};

const CHECKPOINT_KEY = "library";

function toIsoTimestamp(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return new Date(value).toISOString();
}

function fromIsoTimestamp(value: string | null): number | null {
  if (value === null) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function boundedPageValue(value: number | undefined, fallback: number, maximum: number): number {
  return Number.isInteger(value) && value !== undefined && value >= 0
    ? Math.min(value, maximum)
    : fallback;
}

export type DevicePhotoGridRepository = {
  readonly listPhotos: (options?: {
    readonly limit?: number;
    readonly offset?: number;
  }) => Promise<readonly DevicePhotoPreview[]>;
  readonly listLocatedPhotos: (options?: {
    readonly limit?: number;
    readonly offset?: number;
  }) => Promise<readonly DevicePhotoPreview[]>;
};

export type DevicePhotoDetail = {
  readonly id: string;
  readonly mediaType: "photo" | "video" | "live_photo";
  readonly width: number | null;
  readonly height: number | null;
  readonly capturedAt: number | null;
  readonly modifiedAt: number | null;
  readonly hasPrivateLocation: boolean;
  readonly publicationState: "not-published" | "pending" | "published" | "failed";
};

export type DevicePhotoDetailRepository = {
  readonly getPhoto: (assetId: string) => Promise<DevicePhotoDetail | null>;
};

export type DevicePhotoLocationRepository = {
  readonly getLocation: (assetId: string) => Promise<PrivateDevicePhotoLocation | null>;
  readonly saveLocation: (assetId: string, location: PrivateDevicePhotoLocation) => Promise<void>;
};

export function createDevicePhotoLocationRepository(
  database: DevicePhotoSqlExecutor
): DevicePhotoLocationRepository {
  return {
    async getLocation(assetId) {
      if (assetId.trim() === "") return null;
      const row = await database.getFirstAsync<{
        readonly latitude: number | null;
        readonly longitude: number | null;
      }>("SELECT latitude, longitude FROM device_assets WHERE asset_id = ?", [assetId]);
      if (row?.latitude === null || row?.latitude === undefined ||
        row.longitude === null || row.longitude === undefined) return null;
      return { latitude: row.latitude, longitude: row.longitude };
    },

    async saveLocation(assetId, location) {
      if (assetId.trim() === "" || !isValidPrivateDevicePhotoLocation(location)) {
        throw new Error("Invalid private photo location");
      }
      await database.runAsync(
        "UPDATE device_assets SET latitude = ?, longitude = ? WHERE asset_id = ?",
        [location.latitude, location.longitude, assetId]
      );
    }
  };
}

function toPublicationState(
  status: DevicePhotoDetailRow["publication_status"]
): DevicePhotoDetail["publicationState"] {
  if (status === "pending" || status === "running") return "pending";
  if (status === "succeeded") return "published";
  if (status === "failed") return "failed";
  return "not-published";
}

export function createDevicePhotoDetailRepository(
  database: DevicePhotoSqlExecutor
): DevicePhotoDetailRepository {
  return {
    async getPhoto(assetId) {
      if (assetId.trim() === "") return null;
      const row = await database.getFirstAsync<DevicePhotoDetailRow>(
        `SELECT
           asset.asset_id,
           asset.media_type,
           asset.width,
           asset.height,
           asset.created_at,
           asset.modified_at,
           asset.latitude,
           asset.longitude,
           (
             SELECT job.status FROM publication_jobs AS job
             WHERE job.device_asset_id = asset.asset_id
             ORDER BY job.updated_at DESC, job.job_id DESC
             LIMIT 1
           ) AS publication_status
         FROM device_assets AS asset
         WHERE asset.asset_id = ?`,
        [assetId]
      );
      if (row === null) return null;
      return {
        id: row.asset_id,
        mediaType: row.media_type,
        width: row.width,
        height: row.height,
        capturedAt: fromIsoTimestamp(row.created_at),
        modifiedAt: fromIsoTimestamp(row.modified_at),
        hasPrivateLocation: row.latitude !== null && row.longitude !== null,
        publicationState: toPublicationState(row.publication_status)
      };
    }
  };
}

function mapGridRows(rows: readonly DevicePhotoGridRow[]): readonly DevicePhotoPreview[] {
  return rows.map((row) => ({
    id: row.asset_id,
    filename: null,
    width: row.width,
    height: row.height,
    creationTime: fromIsoTimestamp(row.created_at),
    modificationTime: fromIsoTimestamp(row.modified_at),
    latitude: row.latitude,
    longitude: row.longitude
  }));
}

export function createDevicePhotoGridRepository(
  database: DevicePhotoSqlExecutor
): DevicePhotoGridRepository {
  return {
    async listPhotos(options = {}) {
      const limit = Math.max(1, boundedPageValue(options.limit, 60, 250));
      const offset = boundedPageValue(options.offset, 0, Number.MAX_SAFE_INTEGER);
      const rows = await database.getAllAsync<DevicePhotoGridRow>(
        `SELECT asset_id, width, height, created_at, modified_at, latitude, longitude
         FROM device_assets
         ORDER BY
           CASE WHEN created_at IS NULL THEN 1 ELSE 0 END,
           created_at DESC,
           asset_id
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      return mapGridRows(rows);
    },

    async listLocatedPhotos(options = {}) {
      const limit = Math.max(1, boundedPageValue(options.limit, 500, 1_000));
      const offset = boundedPageValue(options.offset, 0, Number.MAX_SAFE_INTEGER);
      const rows = await database.getAllAsync<DevicePhotoGridRow>(
        `SELECT asset_id, width, height, created_at, modified_at, latitude, longitude
         FROM device_assets
         WHERE latitude IS NOT NULL AND longitude IS NOT NULL
         ORDER BY
           CASE WHEN created_at IS NULL THEN 1 ELSE 0 END,
           created_at DESC,
           asset_id
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      return mapGridRows(rows);
    }
  };
}

async function upsertPhoto(
  transaction: DevicePhotoSqlExecutor,
  photo: DevicePhotoPreview,
  scanStartedAt: string
) {
  await transaction.runAsync(
    `INSERT INTO device_assets(
      asset_id, uri, media_type, width, height, created_at, modified_at, indexed_at
    ) VALUES (?, ?, 'photo', ?, ?, ?, ?, ?)
    ON CONFLICT(asset_id) DO UPDATE SET
      uri = excluded.uri,
      media_type = CASE
        WHEN device_assets.modified_at IS NOT excluded.modified_at THEN 'photo'
        ELSE device_assets.media_type
      END,
      width = excluded.width,
      height = excluded.height,
      created_at = excluded.created_at,
      modified_at = excluded.modified_at,
      latitude = CASE
        WHEN device_assets.modified_at IS NOT excluded.modified_at THEN NULL
        ELSE device_assets.latitude
      END,
      longitude = CASE
        WHEN device_assets.modified_at IS NOT excluded.modified_at THEN NULL
        ELSE device_assets.longitude
      END,
      exif_json = CASE
        WHEN device_assets.modified_at IS NOT excluded.modified_at THEN NULL
        ELSE device_assets.exif_json
      END,
      indexed_at = excluded.indexed_at`,
    [
      photo.id,
      photo.id,
      photo.width,
      photo.height,
      toIsoTimestamp(photo.creationTime),
      toIsoTimestamp(photo.modificationTime),
      scanStartedAt
    ]
  );
  await transaction.runAsync("DELETE FROM tombstones WHERE asset_id = ?", [photo.id]);
}

export type DevicePhotoMetadataRepository = {
  readonly getPendingAssetIds: (limit: number) => Promise<readonly string[]>;
  readonly saveMetadata: (assetId: string, metadata: SafeDevicePhotoMetadata) => Promise<void>;
};

export function createDevicePhotoMetadataRepository(
  database: DevicePhotoSqlExecutor
): DevicePhotoMetadataRepository {
  return {
    async getPendingAssetIds(limit) {
      const boundedLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 250) : 1;
      const rows = await database.getAllAsync<{ readonly asset_id: string }>(
        `SELECT asset_id FROM device_assets
         WHERE exif_json IS NULL
         ORDER BY created_at DESC, asset_id
         LIMIT ?`,
        [boundedLimit]
      );
      return rows.map((row) => row.asset_id);
    },

    async saveMetadata(assetId, metadata) {
      await database.runAsync(
        `UPDATE device_assets SET
          media_type = ?,
          created_at = COALESCE(?, created_at),
          latitude = ?,
          longitude = ?,
          exif_json = ?
         WHERE asset_id = ?`,
        [
          metadata.mediaType,
          metadata.capturedAt,
          metadata.latitude,
          metadata.longitude,
          metadata.exifJson,
          assetId
        ]
      );
    }
  };
}

async function saveCheckpoint(
  transaction: DevicePhotoSqlExecutor,
  checkpoint: DevicePhotoScanCheckpoint
) {
  await transaction.runAsync(
    `INSERT INTO sync_checkpoints(
      checkpoint_key, cursor, last_asset_id, processed_asset_count, updated_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(checkpoint_key) DO UPDATE SET
      cursor = excluded.cursor,
      last_asset_id = excluded.last_asset_id,
      processed_asset_count = excluded.processed_asset_count,
      updated_at = excluded.updated_at`,
    [
      CHECKPOINT_KEY,
      checkpoint.scanStartedAt,
      checkpoint.lastAssetId,
      checkpoint.processedAssetCount,
      new Date().toISOString()
    ]
  );
}

export function createSQLiteDevicePhotoScanStore(
  database: DevicePhotoSqlDatabase
): DevicePhotoScanStore {
  return {
    async getCheckpoint() {
      const row = await database.getFirstAsync<CheckpointRow>(
        `SELECT cursor, last_asset_id, processed_asset_count
         FROM sync_checkpoints WHERE checkpoint_key = ?`,
        [CHECKPOINT_KEY]
      );
      if (row === null || row.cursor === null || row.last_asset_id === null) return null;
      return {
        offset: row.processed_asset_count,
        lastAssetId: row.last_asset_id,
        processedAssetCount: row.processed_asset_count,
        scanStartedAt: row.cursor
      };
    },

    async persistPage(photos, checkpoint) {
      await database.withExclusiveTransactionAsync(async (transaction) => {
        for (const photo of photos) await upsertPhoto(transaction, photo, checkpoint.scanStartedAt);
        await saveCheckpoint(transaction, checkpoint);
      });
    },

    async clearCheckpoint() {
      await database.runAsync("DELETE FROM sync_checkpoints WHERE checkpoint_key = ?", [CHECKPOINT_KEY]);
    },

    async completeScan(scanStartedAt) {
      let removedAssetCount = 0;
      await database.withExclusiveTransactionAsync(async (transaction) => {
        const staleAssets = await transaction.getAllAsync<{ readonly asset_id: string }>(
          "SELECT asset_id FROM device_assets WHERE indexed_at <> ? ORDER BY asset_id",
          [scanStartedAt]
        );
        removedAssetCount = staleAssets.length;
        await transaction.runAsync("DELETE FROM sync_checkpoints WHERE checkpoint_key = ?", [CHECKPOINT_KEY]);
        for (const { asset_id: assetId } of staleAssets) {
          await transaction.runAsync(
            `INSERT INTO tombstones(asset_id, removed_at, sync_state, reason)
             VALUES (?, ?, 'pending', 'device-original-missing')
             ON CONFLICT(asset_id) DO UPDATE SET
               removed_at = excluded.removed_at,
               sync_state = 'pending',
               reason = excluded.reason`,
            [assetId, scanStartedAt]
          );
        }
        await transaction.runAsync("DELETE FROM device_assets WHERE indexed_at <> ?", [scanStartedAt]);
      });
      return removedAssetCount;
    }
  };
}

type ExpoSqlExecutor = Pick<SQLiteDatabase, "runAsync" | "getFirstAsync" | "getAllAsync">;

function adaptExpoSqlExecutor(executor: ExpoSqlExecutor): DevicePhotoSqlExecutor {
  return {
    runAsync: (source, params) => executor.runAsync(source, params),
    getFirstAsync: <T>(source: string, params: SqlValue[] = []) => executor.getFirstAsync<T>(source, params),
    getAllAsync: <T>(source: string, params: SqlValue[] = []) => executor.getAllAsync<T>(source, params)
  };
}

export function createExpoSQLiteDevicePhotoScanStore(
  database: SQLiteDatabase
): DevicePhotoScanStore {
  const executor = adaptExpoSqlExecutor(database);
  return createSQLiteDevicePhotoScanStore({
    ...executor,
    withExclusiveTransactionAsync: (task) =>
      database.withExclusiveTransactionAsync((transaction) => task(adaptExpoSqlExecutor(transaction)))
  });
}

export function createExpoSQLiteDevicePhotoMetadataRepository(
  database: SQLiteDatabase
): DevicePhotoMetadataRepository {
  return createDevicePhotoMetadataRepository(adaptExpoSqlExecutor(database));
}

export function listExpoSQLiteDevicePhotos(
  database: SQLiteDatabase,
  limit = 60
): Promise<readonly DevicePhotoPreview[]> {
  return createDevicePhotoGridRepository(adaptExpoSqlExecutor(database)).listPhotos({ limit });
}

export function listExpoSQLiteLocatedDevicePhotos(
  database: SQLiteDatabase,
  limit = 500
): Promise<readonly DevicePhotoPreview[]> {
  return createDevicePhotoGridRepository(adaptExpoSqlExecutor(database)).listLocatedPhotos({ limit });
}

export function getExpoSQLiteDevicePhotoDetail(
  database: SQLiteDatabase,
  assetId: string
): Promise<DevicePhotoDetail | null> {
  return createDevicePhotoDetailRepository(adaptExpoSqlExecutor(database)).getPhoto(assetId);
}

export function getExpoSQLiteDevicePhotoLocation(
  database: SQLiteDatabase,
  assetId: string
): Promise<PrivateDevicePhotoLocation | null> {
  return createDevicePhotoLocationRepository(adaptExpoSqlExecutor(database)).getLocation(assetId);
}

export function saveExpoSQLiteDevicePhotoLocation(
  database: SQLiteDatabase,
  assetId: string,
  location: PrivateDevicePhotoLocation
): Promise<void> {
  return createDevicePhotoLocationRepository(adaptExpoSqlExecutor(database)).saveLocation(assetId, location);
}
