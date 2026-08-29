import { requireNativeModule } from "expo";

import {
  deriveBackupExcludedDirectory,
  LocalPhotoDatabasePolicyError,
  type NativeDirectoryObservation
} from "./local-photo-database";

export interface NativeLocalStorageModule {
  readonly getDatabaseDirectoryObservation: () => Promise<unknown>;
}

export type NativeLocalPhotoStorageAdapter = {
  readonly getDatabaseDirectoryObservation: () => Promise<NativeDirectoryObservation>;
};

export class InvalidNativeDirectoryObservationError extends Error {
  public constructor(cause?: unknown) {
    super("Native local photo storage returned an invalid directory observation", { cause });
    this.name = "InvalidNativeDirectoryObservationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidNativeDirectoryObservationError();
  }
  return value;
}

function parseNativeDirectoryObservation(value: unknown): NativeDirectoryObservation {
  if (!isRecord(value)) throw new InvalidNativeDirectoryObservationError();

  const platform = readString(value, "platform");
  let observation: NativeDirectoryObservation;
  if (platform === "android") {
    if (
      readString(value, "trustedRootKind") !== "no-backup-files" ||
      readString(value, "verification") !== "native-adapter-observed"
    ) {
      throw new InvalidNativeDirectoryObservationError();
    }
    observation = {
      platform,
      expectedApplicationId: readString(value, "expectedApplicationId"),
      adapterApplicationId: readString(value, "adapterApplicationId"),
      trustedRootUri: readString(value, "trustedRootUri"),
      databaseDirectoryUri: readString(value, "databaseDirectoryUri"),
      trustedRootKind: "no-backup-files",
      verification: "native-adapter-observed"
    };
  } else if (platform === "ios") {
    if (
      readString(value, "trustedRootKind") !== "application-support" ||
      readString(value, "verification") !== "native-adapter-observed" ||
      readString(value, "nativeBackupExclusion") !== "verified"
    ) {
      throw new InvalidNativeDirectoryObservationError();
    }
    observation = {
      platform,
      expectedBundleId: readString(value, "expectedBundleId"),
      adapterBundleId: readString(value, "adapterBundleId"),
      trustedRootUri: readString(value, "trustedRootUri"),
      databaseDirectoryUri: readString(value, "databaseDirectoryUri"),
      trustedRootKind: "application-support",
      verification: "native-adapter-observed",
      nativeBackupExclusion: "verified"
    };
  } else {
    throw new InvalidNativeDirectoryObservationError();
  }

  try {
    deriveBackupExcludedDirectory(observation);
  } catch (cause) {
    if (cause instanceof LocalPhotoDatabasePolicyError) throw cause;
    throw new InvalidNativeDirectoryObservationError(cause);
  }
  return observation;
}

function loadNativeModule(): NativeLocalStorageModule {
  return requireNativeModule<NativeLocalStorageModule>("IkkyeeLocalStorage");
}

export function createNativeLocalPhotoStorageAdapter(
  loadModule: () => NativeLocalStorageModule = loadNativeModule
): NativeLocalPhotoStorageAdapter {
  return {
    async getDatabaseDirectoryObservation() {
      return parseNativeDirectoryObservation(
        await loadModule().getDatabaseDirectoryObservation()
      );
    }
  };
}

export const nativeLocalPhotoStorage = createNativeLocalPhotoStorageAdapter();
