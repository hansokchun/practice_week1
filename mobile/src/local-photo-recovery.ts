import {
  migrateLocalPhotoDatabase,
  requiredLocalPhotoIndexes,
  requiredLocalPhotoTables,
  type LocalSchemaDatabase
} from "./local-photo-database";

export type LocalPhotoReindexAsset = {
  readonly assetId: string;
  readonly uri: string;
  readonly mediaType: "photo" | "video" | "live_photo";
  readonly fingerprint: string;
};

export interface LocalPhotoReindexSource {
  readonly readAssets: () => Promise<readonly LocalPhotoReindexAsset[]>;
}

export interface LocalPhotoReindexer {
  readonly reindex: (
    database: LocalSchemaDatabase,
    assets: readonly LocalPhotoReindexAsset[]
  ) => Promise<void>;
}

export interface LocalPhotoReplacementStore {
  readonly createReplacement: () => Promise<LocalSchemaDatabase>;
  readonly activateReplacement: (database: LocalSchemaDatabase) => Promise<void>;
  readonly discardReplacement: (database: LocalSchemaDatabase) => Promise<void>;
}

export interface LocalPhotoCorruptionProbe {
  readonly isCorrupt: (databaseBytes: Uint8Array) => Promise<boolean>;
}

export type LocalPhotoRecoveryRequest = {
  readonly corruptDatabaseBytes: Uint8Array;
  readonly corruptionProbe: LocalPhotoCorruptionProbe;
  readonly assetSource: LocalPhotoReindexSource;
  readonly reindexer: LocalPhotoReindexer;
  readonly replacementStore: LocalPhotoReplacementStore;
};

export type LocalPhotoRecoveryResult = {
  readonly requiresReindex: true;
  readonly originalAssetsTouched: false;
  readonly reindexInvoked: true;
  readonly replacementUserVersion: 2;
  readonly replacementForeignKeyCheck: "ok";
  readonly replacementIntegrityCheck: "ok";
  readonly requiredTablesPresent: true;
  readonly requiredIndexesPresent: true;
  readonly originalBytesUnchanged: true;
  readonly originalAssetSourceUnchanged: true;
};

export class LocalPhotoRecoveryError extends Error {
  public constructor(cause?: unknown) {
    super("Local photo database recovery failed", { cause });
    this.name = "LocalPhotoRecoveryError";
  }
}

function cloneAssets(assets: readonly LocalPhotoReindexAsset[]): readonly LocalPhotoReindexAsset[] {
  return assets.map((asset) => ({ ...asset }));
}

function assetSourcesMatch(
  before: readonly LocalPhotoReindexAsset[],
  after: readonly LocalPhotoReindexAsset[]
): boolean {
  return (
    before.length === after.length &&
    before.every((asset, index) => {
      const current = after[index];
      return (
        current !== undefined &&
        current.assetId === asset.assetId &&
        current.uri === asset.uri &&
        current.mediaType === asset.mediaType &&
        current.fingerprint === asset.fingerprint
      );
    })
  );
}

function bytesMatch(before: Uint8Array, after: Uint8Array): boolean {
  return before.length === after.length && before.every((value, index) => after[index] === value);
}

export async function recoverCorruptLocalPhotoDatabase(
  request: LocalPhotoRecoveryRequest
): Promise<LocalPhotoRecoveryResult> {
  const originalBytes = Uint8Array.from(request.corruptDatabaseBytes);
  const originalAssets = cloneAssets(await request.assetSource.readAssets());
  if (!(await request.corruptionProbe.isCorrupt(request.corruptDatabaseBytes))) {
    throw new LocalPhotoRecoveryError();
  }

  const replacement = await request.replacementStore.createReplacement();
  try {
    await migrateLocalPhotoDatabase(replacement);
    await request.reindexer.reindex(replacement, cloneAssets(originalAssets));
    const replacementUserVersion = await replacement.getUserVersion();
    const replacementIntegrityCheck = await replacement.getIntegrityResult();
    const replacementForeignKeyCheck =
      (await replacement.getForeignKeyViolationCount()) === 0 ? "ok" : "failed";
    const tableNames = await replacement.getSchemaObjectNames("table");
    const indexNames = await replacement.getSchemaObjectNames("index");
    const requiredTablesPresent = requiredLocalPhotoTables.every((name) =>
      tableNames.includes(name)
    );
    const requiredIndexesPresent = requiredLocalPhotoIndexes.every((name) =>
      indexNames.includes(name)
    );
    const finalAssets = await request.assetSource.readAssets();
    const originalBytesUnchanged = bytesMatch(originalBytes, request.corruptDatabaseBytes);
    const originalAssetSourceUnchanged = assetSourcesMatch(originalAssets, finalAssets);

    if (
      replacementUserVersion !== 2 ||
      replacementIntegrityCheck !== "ok" ||
      replacementForeignKeyCheck !== "ok" ||
      !requiredTablesPresent ||
      !requiredIndexesPresent ||
      !originalBytesUnchanged ||
      !originalAssetSourceUnchanged
    ) {
      throw new LocalPhotoRecoveryError();
    }
    await request.replacementStore.activateReplacement(replacement);
    return {
      requiresReindex: true,
      originalAssetsTouched: false,
      reindexInvoked: true,
      replacementUserVersion: 2,
      replacementForeignKeyCheck: "ok",
      replacementIntegrityCheck: "ok",
      requiredTablesPresent: true,
      requiredIndexesPresent: true,
      originalBytesUnchanged: true,
      originalAssetSourceUnchanged: true
    };
  } catch (cause) {
    try {
      await request.replacementStore.discardReplacement(replacement);
    } catch (discardCause) {
      throw new LocalPhotoRecoveryError(discardCause);
    }
    if (cause instanceof LocalPhotoRecoveryError) {
      throw cause;
    }
    throw new LocalPhotoRecoveryError(cause);
  }
}
