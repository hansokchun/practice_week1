import type { SQLiteDatabase } from "expo-sqlite";

import { createLocalPhotoIndexingRuntime } from "../src/local-photo-indexing-runtime";

const directoryObservation = {
  platform: "android" as const,
  expectedApplicationId: "com.ikkyee.mobile",
  adapterApplicationId: "com.ikkyee.mobile",
  trustedRootUri: "file:///data/user/0/com.ikkyee.mobile/no_backup",
  databaseDirectoryUri: "file:///data/user/0/com.ikkyee.mobile/no_backup/ikkyee-local",
  trustedRootKind: "no-backup-files" as const,
  verification: "native-adapter-observed" as const
};

describe("local photo indexing runtime", () => {
  it("opens the verified database, indexes device photos, and closes the handle", async () => {
    const closeAsync = jest.fn(async () => undefined);
    const database = { closeAsync } as unknown as SQLiteDatabase;
    const getDatabaseDirectoryObservation = jest.fn(async () => directoryObservation);
    const openDatabase = jest.fn(async () => ({ database, fromVersion: 0, toVersion: 1 }));
    const indexPhotos = jest.fn(async () => ({
      status: "completed" as const,
      processedAssetCount: 42,
      removedAssetCount: 2,
      restartedForDrift: false
    }));
    const enrichMetadata = jest.fn(async () => ({ processedAssetCount: 2 }));
    const pruneThumbnails = jest.fn(async () => ({ removedThumbnailCount: 1 }));
    const listPhotos = jest.fn(async () => []);
    const listLocatedPhotos = jest.fn(async () => []);
    const getPhoto = jest.fn(async () => null);
    const recoverPublications = jest.fn(async () => 1);

    const result = await createLocalPhotoIndexingRuntime({
      storage: { getDatabaseDirectoryObservation },
      openDatabase,
      indexPhotos,
      enrichMetadata,
      pruneThumbnails,
      listPhotos,
      listLocatedPhotos,
      getPhoto,
      recoverPublications
    }).index();

    expect(openDatabase).toHaveBeenCalledWith({
      databaseName: "ikkyee-local.db",
      directoryObservation
    });
    expect(recoverPublications).toHaveBeenCalledWith(database);
    expect(indexPhotos).toHaveBeenCalledWith(database);
    expect(enrichMetadata).toHaveBeenCalledWith(database);
    expect(pruneThumbnails).toHaveBeenCalledWith(database);
    expect(closeAsync).toHaveBeenCalledTimes(1);
    expect(result.processedAssetCount).toBe(42);
  });

  it("closes the database when indexing fails", async () => {
    const closeAsync = jest.fn(async () => undefined);
    const database = { closeAsync } as unknown as SQLiteDatabase;
    const runtime = createLocalPhotoIndexingRuntime({
      storage: { getDatabaseDirectoryObservation: async () => directoryObservation },
      openDatabase: async () => ({ database, fromVersion: 1, toVersion: 1 }),
      enrichMetadata: async () => ({ processedAssetCount: 0 }),
      pruneThumbnails: async () => ({ removedThumbnailCount: 0 }),
      listPhotos: async () => [],
      listLocatedPhotos: async () => [],
      getPhoto: async () => null,
      indexPhotos: async () => {
        throw new Error("scan failed");
      }
    });

    await expect(runtime.index()).rejects.toThrow("scan failed");
    expect(closeAsync).toHaveBeenCalledTimes(1);
  });

  it("returns the SQLite grid result after refreshing the index", async () => {
    const closeAsync = jest.fn(async () => undefined);
    const database = { closeAsync } as unknown as SQLiteDatabase;
    const photos = [{
      id: "asset-db",
      filename: null,
      width: 100,
      height: 200,
      creationTime: 3_000,
      modificationTime: 4_000
    }];
    const listPhotos = jest.fn(async () => photos);
    const mapPhotos = [{
      id: "asset-db",
      filename: null,
      width: 100,
      height: 200,
      creationTime: 3_000,
      modificationTime: 4_000,
      latitude: 33.4,
      longitude: 126.5
    }];
    const listLocatedPhotos = jest.fn(async () => mapPhotos);
    const runtime = createLocalPhotoIndexingRuntime({
      storage: { getDatabaseDirectoryObservation: async () => directoryObservation },
      openDatabase: async () => ({ database, fromVersion: 1, toVersion: 1 }),
      indexPhotos: async () => ({
        status: "completed",
        processedAssetCount: 1,
        removedAssetCount: 0,
        restartedForDrift: false
      }),
      enrichMetadata: async () => ({ processedAssetCount: 0 }),
      pruneThumbnails: async () => ({ removedThumbnailCount: 0 }),
      listPhotos,
      listLocatedPhotos,
      getPhoto: async () => null
    });

    await expect(runtime.refresh(60)).resolves.toEqual({
      scan: {
        status: "completed",
        processedAssetCount: 1,
        removedAssetCount: 0,
        restartedForDrift: false
      },
      photos,
      mapPhotos
    });
    expect(listPhotos).toHaveBeenCalledWith(database, 60);
    expect(listLocatedPhotos).toHaveBeenCalledWith(database, 500);
    expect(closeAsync).toHaveBeenCalledTimes(1);
  });

  it("loads one indexed photo detail and closes the database", async () => {
    const closeAsync = jest.fn(async () => undefined);
    const database = { closeAsync } as unknown as SQLiteDatabase;
    const detail = {
      id: "asset-detail",
      mediaType: "photo" as const,
      width: 100,
      height: 200,
      capturedAt: 3_000,
      modifiedAt: 4_000,
      hasPrivateLocation: false,
      publicationState: "not-published" as const
    };
    const getPhoto = jest.fn(async () => detail);
    const runtime = createLocalPhotoIndexingRuntime({
      storage: { getDatabaseDirectoryObservation: async () => directoryObservation },
      openDatabase: async () => ({ database, fromVersion: 1, toVersion: 1 }),
      indexPhotos: async () => ({ status: "completed", processedAssetCount: 0, removedAssetCount: 0, restartedForDrift: false }),
      enrichMetadata: async () => ({ processedAssetCount: 0 }),
      pruneThumbnails: async () => ({ removedThumbnailCount: 0 }),
      listPhotos: async () => [],
      listLocatedPhotos: async () => [],
      getPhoto
    });

    await expect(runtime.getPhoto("asset-detail")).resolves.toEqual(detail);
    expect(getPhoto).toHaveBeenCalledWith(database, "asset-detail");
    expect(closeAsync).toHaveBeenCalledTimes(1);
  });
});
