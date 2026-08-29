import {
  createNativeLocalPhotoStorageAdapter,
  type NativeLocalStorageModule
} from "../src/native-local-photo-storage";

const androidObservation = {
  platform: "android" as const,
  expectedApplicationId: "com.ikkyee.mobile",
  adapterApplicationId: "com.ikkyee.mobile",
  trustedRootUri: "file:///data/user/0/com.ikkyee.mobile/no_backup",
  databaseDirectoryUri: "file:///data/user/0/com.ikkyee.mobile/no_backup/ikkyee-local",
  trustedRootKind: "no-backup-files" as const,
  verification: "native-adapter-observed" as const
};

describe("native local photo storage", () => {
  it("accepts a native observation only after the database policy verifies it", async () => {
    const getDatabaseDirectoryObservation = jest.fn(async () => androidObservation);
    const module: NativeLocalStorageModule = { getDatabaseDirectoryObservation };

    const observation = await createNativeLocalPhotoStorageAdapter(() => module)
      .getDatabaseDirectoryObservation();

    expect(observation).toEqual(androidObservation);
    expect(getDatabaseDirectoryObservation).toHaveBeenCalledTimes(1);
  });

  it("rejects a native observation whose application identity does not match", async () => {
    const module: NativeLocalStorageModule = {
      getDatabaseDirectoryObservation: async () => ({
        ...androidObservation,
        adapterApplicationId: "com.attacker.app"
      })
    };

    await expect(
      createNativeLocalPhotoStorageAdapter(() => module).getDatabaseDirectoryObservation()
    ).rejects.toThrow("Local photo database directory must be platform-provided and backup-excluded");
  });

  it("rejects an incomplete value returned across the native bridge", async () => {
    const module: NativeLocalStorageModule = {
      getDatabaseDirectoryObservation: async () => ({ platform: "android" })
    };

    await expect(
      createNativeLocalPhotoStorageAdapter(() => module).getDatabaseDirectoryObservation()
    ).rejects.toThrow("Native local photo storage returned an invalid directory observation");
  });

  it("keeps Android and iOS implementations on platform backup-excluded storage", () => {
    const { readFileSync } = jest.requireActual<{
      readFileSync(path: string, encoding: string): string;
    }>("node:fs");
    const runtime = globalThis as unknown as { process: { cwd(): string } };
    const moduleRoot = `${runtime.process.cwd()}/modules/ikkyee-local-storage`;
    const config = readFileSync(`${moduleRoot}/expo-module.config.json`, "utf8");
    const android = readFileSync(
      `${moduleRoot}/android/src/main/java/expo/modules/ikkyeelocalstorage/IkkyeeLocalStorageModule.kt`,
      "utf8"
    );
    const ios = readFileSync(`${moduleRoot}/ios/IkkyeeLocalStorageModule.swift`, "utf8");

    expect(config).toContain('"IkkyeeLocalStorageModule"');
    expect(config).toContain('"expo.modules.ikkyeelocalstorage.IkkyeeLocalStorageModule"');
    expect(android).toContain("noBackupFilesDir");
    expect(android).toContain('File(trustedRoot, "ikkyee-local")');
    expect(android).not.toMatch(/externalFilesDir|cacheDir/);
    expect(ios).toContain(".applicationSupportDirectory");
    expect(ios).toContain('appendingPathComponent("ikkyee-local", isDirectory: true)');
    expect(ios).toContain("isExcludedFromBackup = true");
    expect(ios).toContain("nativeBackupExclusion");
  });
});
