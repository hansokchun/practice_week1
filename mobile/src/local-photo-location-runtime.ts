import type { SQLiteDatabase } from "expo-sqlite";

import type { PrivateDevicePhotoLocation } from "./device-photo-location";
import {
  getExpoSQLiteDevicePhotoLocation,
  saveExpoSQLiteDevicePhotoLocation
} from "./device-photo-repository";
import {
  openLocalPhotoDatabase,
  type LocalPhotoDatabaseHandle,
  type LocalPhotoDatabaseOpenOptions
} from "./local-photo-database";
import {
  nativeLocalPhotoStorage,
  type NativeLocalPhotoStorageAdapter
} from "./native-local-photo-storage";

type LocalPhotoLocationDependencies = {
  readonly storage: NativeLocalPhotoStorageAdapter;
  readonly openDatabase: (
    options: LocalPhotoDatabaseOpenOptions
  ) => Promise<LocalPhotoDatabaseHandle>;
  readonly getLocation: (
    database: SQLiteDatabase,
    assetId: string
  ) => Promise<PrivateDevicePhotoLocation | null>;
  readonly saveLocation: (
    database: SQLiteDatabase,
    assetId: string,
    location: PrivateDevicePhotoLocation
  ) => Promise<void>;
};

export type LocalPhotoLocationRuntime = {
  readonly getLocation: (assetId: string) => Promise<PrivateDevicePhotoLocation | null>;
  readonly saveLocation: (
    assetId: string,
    location: PrivateDevicePhotoLocation
  ) => Promise<void>;
};

export function createLocalPhotoLocationRuntime(
  dependencies: LocalPhotoLocationDependencies
): LocalPhotoLocationRuntime {
  async function withDatabase<T>(task: (database: SQLiteDatabase) => Promise<T>): Promise<T> {
    const directoryObservation = await dependencies.storage.getDatabaseDirectoryObservation();
    const handle = await dependencies.openDatabase({
      databaseName: "ikkyee-local.db",
      directoryObservation
    });
    try {
      return await task(handle.database);
    } finally {
      await handle.database.closeAsync();
    }
  }

  return {
    getLocation: (assetId) => withDatabase((database) =>
      dependencies.getLocation(database, assetId)),
    saveLocation: (assetId, location) => withDatabase((database) =>
      dependencies.saveLocation(database, assetId, location))
  };
}

export const localPhotoLocationRuntime = createLocalPhotoLocationRuntime({
  storage: nativeLocalPhotoStorage,
  openDatabase: openLocalPhotoDatabase,
  getLocation: getExpoSQLiteDevicePhotoLocation,
  saveLocation: saveExpoSQLiteDevicePhotoLocation
});
