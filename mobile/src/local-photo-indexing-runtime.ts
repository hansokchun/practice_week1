import type { SQLiteDatabase } from "expo-sqlite";

import { indexDevicePhotoLibrary } from "./device-photo-indexer";
import { enrichExpoDevicePhotoMetadata } from "./device-photo-metadata-enricher";
import { pruneExpoDevicePhotoThumbnails } from "./device-photo-thumbnail-cleanup";
import {
  openLocalPhotoDatabase,
  type LocalPhotoDatabaseHandle,
  type LocalPhotoDatabaseOpenOptions
} from "./local-photo-database";
import {
  nativeLocalPhotoStorage,
  type NativeLocalPhotoStorageAdapter
} from "./native-local-photo-storage";
import type { DevicePhotoScanResult } from "./device-photo-scan";
import type { DevicePhotoPreview } from "./device-photo-library";
import {
  getExpoSQLiteDevicePhotoDetail,
  listExpoSQLiteDevicePhotos,
  listExpoSQLiteLocatedDevicePhotos,
  type DevicePhotoDetail
} from "./device-photo-repository";
import { recoverInterruptedPublicationJobsOnce } from "./publication-job-repository";

type LocalPhotoIndexingDependencies = {
  readonly storage: NativeLocalPhotoStorageAdapter;
  readonly openDatabase: (
    options: LocalPhotoDatabaseOpenOptions
  ) => Promise<LocalPhotoDatabaseHandle>;
  readonly indexPhotos: (database: SQLiteDatabase) => Promise<DevicePhotoScanResult>;
  readonly enrichMetadata: (
    database: SQLiteDatabase
  ) => Promise<{ readonly processedAssetCount: number }>;
  readonly pruneThumbnails: (
    database: SQLiteDatabase
  ) => Promise<{ readonly removedThumbnailCount: number }>;
  readonly listPhotos: (
    database: SQLiteDatabase,
    limit: number
  ) => Promise<readonly DevicePhotoPreview[]>;
  readonly listLocatedPhotos: (
    database: SQLiteDatabase,
    limit: number
  ) => Promise<readonly DevicePhotoPreview[]>;
  readonly getPhoto: (
    database: SQLiteDatabase,
    assetId: string
  ) => Promise<DevicePhotoDetail | null>;
  readonly recoverPublications?: (database: SQLiteDatabase) => Promise<number>;
};

export type LocalPhotoRefreshResult = {
  readonly scan: DevicePhotoScanResult;
  readonly photos: readonly DevicePhotoPreview[];
  readonly mapPhotos: readonly DevicePhotoPreview[];
};

export type LocalPhotoIndexingRuntime = {
  readonly index: () => Promise<DevicePhotoScanResult>;
  readonly refresh: (limit?: number) => Promise<LocalPhotoRefreshResult>;
  readonly getPhoto: (assetId: string) => Promise<DevicePhotoDetail | null>;
};

export function createLocalPhotoIndexingRuntime(
  dependencies: LocalPhotoIndexingDependencies
): LocalPhotoIndexingRuntime {
  async function openHandle() {
    const directoryObservation =
      await dependencies.storage.getDatabaseDirectoryObservation();
    const handle = await dependencies.openDatabase({
      databaseName: "ikkyee-local.db",
      directoryObservation
    });
    try {
      await dependencies.recoverPublications?.(handle.database);
      return handle;
    } catch (cause) {
      await handle.database.closeAsync();
      throw cause;
    }
  }

  async function updateIndex(database: SQLiteDatabase) {
    const result = await dependencies.indexPhotos(database);
    await dependencies.pruneThumbnails(database);
    await dependencies.enrichMetadata(database);
    return result;
  }

  return {
    async index() {
      const handle = await openHandle();
      try {
        return await updateIndex(handle.database);
      } finally {
        await handle.database.closeAsync();
      }
    },

    async refresh(limit = 60) {
      const handle = await openHandle();
      try {
        const scan = await updateIndex(handle.database);
        const photos = await dependencies.listPhotos(handle.database, limit);
        const mapPhotos = await dependencies.listLocatedPhotos(handle.database, 500);
        return { scan, photos, mapPhotos };
      } finally {
        await handle.database.closeAsync();
      }
    },

    async getPhoto(assetId) {
      const handle = await openHandle();
      try {
        return await dependencies.getPhoto(handle.database, assetId);
      } finally {
        await handle.database.closeAsync();
      }
    }
  };
}

export const localPhotoIndexingRuntime = createLocalPhotoIndexingRuntime({
  storage: nativeLocalPhotoStorage,
  openDatabase: openLocalPhotoDatabase,
  indexPhotos: indexDevicePhotoLibrary,
  enrichMetadata: enrichExpoDevicePhotoMetadata,
  pruneThumbnails: pruneExpoDevicePhotoThumbnails,
  listPhotos: listExpoSQLiteDevicePhotos,
  listLocatedPhotos: listExpoSQLiteLocatedDevicePhotos,
  getPhoto: getExpoSQLiteDevicePhotoDetail,
  recoverPublications: (database) => recoverInterruptedPublicationJobsOnce({
    runAsync: (source, params = []) => database.runAsync(source, [...params]),
    getFirstAsync: <T>(source: string, params: readonly (string | number | null)[] = []) =>
      database.getFirstAsync<T>(source, [...params]),
    getAllAsync: <T>(source: string, params: readonly (string | number | null)[] = []) =>
      database.getAllAsync<T>(source, [...params])
  })
});
