import type { SQLiteDatabase } from "expo-sqlite";

import migrationDocument from "./local-schema-migrations.json";

// allow: SIZE_OK - schema migration and directory policy form one database-open boundary.
export type LocalSchemaMigration = {
  readonly version: number;
  readonly name: string;
  readonly statements: readonly string[];
};

export interface LocalSchemaDatabase {
  readonly execAsync: (source: string) => Promise<void>;
  readonly getUserVersion: () => Promise<number>;
  readonly getIntegrityResult: () => Promise<string>;
  readonly getForeignKeyViolationCount: () => Promise<number>;
  readonly getSchemaObjectNames: (type: LocalSchemaObjectType) => Promise<readonly string[]>;
}

export type LocalSchemaObjectType = "table" | "index";

export type NativeDirectoryObservation =
  | {
      readonly platform: "android";
      readonly expectedApplicationId: string;
      readonly adapterApplicationId: string;
      readonly trustedRootUri: string;
      readonly databaseDirectoryUri: string;
      readonly trustedRootKind: "no-backup-files";
      readonly verification: "native-adapter-observed";
    }
  | {
      readonly platform: "ios";
      readonly expectedBundleId: string;
      readonly adapterBundleId: string;
      readonly trustedRootUri: string;
      readonly databaseDirectoryUri: string;
      readonly trustedRootKind: "application-support";
      readonly verification: "native-adapter-observed";
      readonly nativeBackupExclusion: "verified";
    };

export type BackupExcludedDirectory = {
  readonly uri: string;
  readonly backupExcluded: true;
  readonly policy: "android-no-backup-files" | "ios-native-exclusion-verified";
  readonly source: "platform";
};

export type LocalPhotoDatabaseOpenOptions = {
  readonly databaseName: string;
  readonly directoryObservation: NativeDirectoryObservation;
};

export type LocalSchemaMigrationResult = {
  readonly fromVersion: number;
  readonly toVersion: number;
};

export type LocalPhotoDatabaseHandle = LocalSchemaMigrationResult & {
  readonly database: SQLiteDatabase;
};

export class LocalPhotoDatabasePolicyError extends Error {
  public constructor() {
    super("Local photo database directory must be platform-provided and backup-excluded");
    this.name = "LocalPhotoDatabasePolicyError";
  }
}

export class LocalSchemaMigrationError extends Error {
  public constructor(
    public readonly version: number,
    cause?: unknown
  ) {
    super(`Local schema migration ${version} failed`, { cause });
    this.name = "LocalSchemaMigrationError";
  }
}

export class LocalSchemaVersionError extends Error {
  public constructor(public readonly version: number) {
    super("Local schema version is unsupported");
    this.name = "LocalSchemaVersionError";
  }
}

type CanonicalFileDirectory = {
  readonly uri: string;
  readonly segments: readonly string[];
};

const migrations: readonly LocalSchemaMigration[] = migrationDocument;

export const requiredLocalPhotoTables = [
  "device_assets",
  "sync_checkpoints",
  "publication_jobs",
  "tombstones"
] as const;

export const requiredLocalPhotoIndexes = [
  "idx_device_assets_modified_at",
  "idx_device_assets_indexed_at",
  "idx_sync_checkpoints_updated_at",
  "idx_sync_checkpoints_last_asset_id",
  "idx_publication_jobs_status_next_attempt",
  "idx_publication_jobs_device_asset_id",
  "idx_tombstones_removed_at",
  "idx_tombstones_sync_state"
] as const;

function validateMigrations(candidate: readonly LocalSchemaMigration[]): void {
  for (const [index, migration] of candidate.entries()) {
    const expectedVersion = index + 1;
    if (
      migration.version !== expectedVersion ||
      migration.name.trim() === "" ||
      migration.statements.length === 0 ||
      migration.statements.some((statement) => statement.trim() === "")
    ) {
      throw new LocalSchemaVersionError(migration.version);
    }
  }
}

function parseCanonicalFileDirectory(uri: string): CanonicalFileDirectory {
  try {
    if (!uri.startsWith("file:///") || uri.includes("\\") || uri.includes("\0")) {
      throw new LocalPhotoDatabasePolicyError();
    }
    const directoryUrl = new URL(uri);
    if (
      directoryUrl.protocol !== "file:" ||
      directoryUrl.host !== "" ||
      directoryUrl.search !== "" ||
      directoryUrl.hash !== ""
    ) {
      throw new LocalPhotoDatabasePolicyError();
    }
    const rawPath = uri.slice("file://".length);
    if (rawPath.includes("//") || rawPath.endsWith("/")) {
      throw new LocalPhotoDatabasePolicyError();
    }
    const rawSegments = rawPath.slice(1).split("/");
    const segments = rawSegments.map((segment) => {
      const decoded = decodeURIComponent(segment);
      if (
        decoded === "" ||
        decoded === "." ||
        decoded === ".." ||
        decoded.includes("%") ||
        decoded.includes("/") ||
        decoded.includes("\\") ||
        decoded.includes("\0") ||
        encodeURIComponent(decoded) !== segment
      ) {
        throw new LocalPhotoDatabasePolicyError();
      }
      return decoded;
    });
    return { uri: `file:///${rawSegments.join("/")}`, segments };
  } catch (cause) {
    if (
      cause instanceof TypeError ||
      cause instanceof URIError ||
      cause instanceof LocalPhotoDatabasePolicyError
    ) {
      throw new LocalPhotoDatabasePolicyError();
    }
    throw cause;
  }
}

function isExactChild(
  rootSegments: readonly string[],
  childSegments: readonly string[]
): boolean {
  return (
    childSegments.length === rootSegments.length + 1 &&
    childSegments.at(-1) === "ikkyee-local" &&
    rootSegments.every((segment, index) => childSegments[index] === segment)
  );
}

export function deriveBackupExcludedDirectory(
  observation: NativeDirectoryObservation
): BackupExcludedDirectory {
  const root = parseCanonicalFileDirectory(observation.trustedRootUri);
  const databaseDirectory = parseCanonicalFileDirectory(observation.databaseDirectoryUri);
  if (
    observation.verification !== "native-adapter-observed" ||
    !isExactChild(root.segments, databaseDirectory.segments)
  ) {
    throw new LocalPhotoDatabasePolicyError();
  }

  switch (observation.platform) {
    case "android":
      if (
        observation.trustedRootKind !== "no-backup-files" ||
        observation.expectedApplicationId.trim() === "" ||
        observation.adapterApplicationId !== observation.expectedApplicationId ||
        root.segments.length !== 5 ||
        root.segments[0] !== "data" ||
        root.segments[1] !== "user" ||
        !/^\d+$/.test(root.segments[2] ?? "") ||
        root.segments[3] !== observation.adapterApplicationId ||
        root.segments[4] !== "no_backup"
      ) {
        throw new LocalPhotoDatabasePolicyError();
      }
      return {
        uri: databaseDirectory.uri,
        backupExcluded: true,
        policy: "android-no-backup-files",
        source: "platform"
      };
    case "ios":
      if (
        observation.trustedRootKind !== "application-support" ||
        observation.nativeBackupExclusion !== "verified" ||
        observation.expectedBundleId.trim() === "" ||
        observation.adapterBundleId !== observation.expectedBundleId ||
        root.segments.length !== 8 ||
        root.segments[0] !== "var" ||
        root.segments[1] !== "mobile" ||
        root.segments[2] !== "Containers" ||
        root.segments[3] !== "Data" ||
        root.segments[4] !== "Application" ||
        !/^[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}$/.test(root.segments[5] ?? "") ||
        root.segments[6] !== "Library" ||
        root.segments[7] !== "Application Support"
      ) {
        throw new LocalPhotoDatabasePolicyError();
      }
      return {
        uri: databaseDirectory.uri,
        backupExcluded: true,
        policy: "ios-native-exclusion-verified",
        source: "platform"
      };
  }
}

export async function migrateLocalPhotoDatabase(
  database: LocalSchemaDatabase,
  selectedMigrations: readonly LocalSchemaMigration[] = migrations
): Promise<LocalSchemaMigrationResult> {
  validateMigrations(selectedMigrations);
  await database.execAsync("PRAGMA foreign_keys = ON");
  const fromVersion = await database.getUserVersion();
  const latestVersion = selectedMigrations.length;
  if (fromVersion < 0 || fromVersion > latestVersion) {
    throw new LocalSchemaVersionError(fromVersion);
  }

  for (const migration of selectedMigrations.slice(fromVersion)) {
    await database.execAsync("BEGIN IMMEDIATE");
    try {
      for (const statement of migration.statements) {
        await database.execAsync(statement);
      }
      await database.execAsync(`PRAGMA user_version = ${migration.version}`);
      await database.execAsync("COMMIT");
    } catch (cause) {
      try {
        await database.execAsync("ROLLBACK");
      } catch (rollbackCause) {
        throw new LocalSchemaMigrationError(migration.version, rollbackCause);
      }
      throw new LocalSchemaMigrationError(migration.version, cause);
    }
  }

  const integrityResult = await database.getIntegrityResult();
  const foreignKeyViolationCount = await database.getForeignKeyViolationCount();
  if (integrityResult !== "ok" || foreignKeyViolationCount !== 0) {
    throw new LocalSchemaMigrationError(await database.getUserVersion());
  }
  return { fromVersion, toVersion: await database.getUserVersion() };
}

function createExpoSchemaAdapter(database: SQLiteDatabase): LocalSchemaDatabase {
  return {
    execAsync: async (source) => database.execAsync(source),
    getUserVersion: async () => {
      const row = await database.getFirstAsync<{ readonly user_version: number }>(
        "PRAGMA user_version"
      );
      if (row === null || typeof row.user_version !== "number") {
        throw new LocalSchemaVersionError(-1);
      }
      return row.user_version;
    },
    getIntegrityResult: async () => {
      const row = await database.getFirstAsync<{ readonly integrity_check: string }>(
        "PRAGMA integrity_check"
      );
      return row?.integrity_check ?? "missing";
    },
    getForeignKeyViolationCount: async () => {
      const rows = await database.getAllAsync("PRAGMA foreign_key_check");
      return rows.length;
    },
    getSchemaObjectNames: async (type) => {
      const rows = await database.getAllAsync<{ readonly name: string }>(
        "SELECT name FROM sqlite_master WHERE type = ? ORDER BY name",
        type
      );
      return rows.map((row) => row.name);
    }
  };
}

export async function openLocalPhotoDatabase(
  options: LocalPhotoDatabaseOpenOptions
): Promise<LocalPhotoDatabaseHandle> {
  const directory = deriveBackupExcludedDirectory(options.directoryObservation);
  const { openDatabaseAsync } = await import("expo-sqlite");
  const database = await openDatabaseAsync(options.databaseName, undefined, directory.uri);
  const result = await migrateLocalPhotoDatabase(createExpoSchemaAdapter(database));
  return { database, ...result };
}
