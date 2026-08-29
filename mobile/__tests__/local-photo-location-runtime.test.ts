import type { SQLiteDatabase } from "expo-sqlite";

import { createLocalPhotoLocationRuntime } from "../src/local-photo-location-runtime";

const directoryObservation = {
  platform: "android" as const,
  expectedApplicationId: "com.ikkyee.mobile",
  adapterApplicationId: "com.ikkyee.mobile",
  trustedRootUri: "file:///data/user/0/com.ikkyee.mobile/no_backup",
  databaseDirectoryUri: "file:///data/user/0/com.ikkyee.mobile/no_backup/ikkyee-local",
  trustedRootKind: "no-backup-files" as const,
  verification: "native-adapter-observed" as const
};

describe("local photo location runtime", () => {
  it("opens the verified database for private location reads and writes", async () => {
    const closeAsync = jest.fn(async () => undefined);
    const database = { closeAsync } as unknown as SQLiteDatabase;
    const openDatabase = jest.fn(async () => ({ database, fromVersion: 2, toVersion: 2 }));
    const getLocation = jest.fn(async () => null);
    const saveLocation = jest.fn(async () => undefined);
    const runtime = createLocalPhotoLocationRuntime({
      storage: { getDatabaseDirectoryObservation: async () => directoryObservation },
      openDatabase,
      getLocation,
      saveLocation
    });

    await expect(runtime.getLocation("asset-1")).resolves.toBeNull();
    await runtime.saveLocation("asset-1", { latitude: 36, longitude: 128 });

    expect(getLocation).toHaveBeenCalledWith(database, "asset-1");
    expect(saveLocation).toHaveBeenCalledWith(database, "asset-1", { latitude: 36, longitude: 128 });
    expect(openDatabase).toHaveBeenCalledTimes(2);
    expect(closeAsync).toHaveBeenCalledTimes(2);
  });
});
