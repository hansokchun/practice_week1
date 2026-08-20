import type { Database, SqlJsStatic } from "sql.js";

import type {
  LocalSchemaObjectType,
  NativeDirectoryObservation,
  LocalSchemaDatabase,
  LocalSchemaMigration
} from "../src/local-photo-database";
import type { LocalPhotoRecoveryRequest, LocalPhotoReplacementStore,
  LocalPhotoReindexAsset } from "../src/local-photo-recovery";

// allow: SIZE_OK - executable schema fixtures share one initialized sql.js WASM runtime.

const loadDatabaseModule = (): typeof import("../src/local-photo-database") =>
  jest.requireActual("../src/local-photo-database");
const loadRecoveryModule = (): typeof import("../src/local-photo-recovery") =>
  jest.requireActual("../src/local-photo-recovery");
const migrate = async (
  database: LocalSchemaDatabase,
  selectedMigrations?: readonly LocalSchemaMigration[]
) => loadDatabaseModule().migrateLocalPhotoDatabase(database, selectedMigrations);
const deriveBackupExcludedDirectory = (observation: NativeDirectoryObservation) =>
  loadDatabaseModule().deriveBackupExcludedDirectory(observation);
const recover = async (request: LocalPhotoRecoveryRequest) =>
  loadRecoveryModule().recoverCorruptLocalPhotoDatabase(request);

let migrations: readonly LocalSchemaMigration[] = [];

const validAndroidObservation: NativeDirectoryObservation = {
  platform: "android",
  expectedApplicationId: "com.ikkyee.mobile",
  adapterApplicationId: "com.ikkyee.mobile",
  trustedRootUri: "file:///data/user/0/com.ikkyee.mobile/no_backup",
  databaseDirectoryUri: "file:///data/user/0/com.ikkyee.mobile/no_backup/ikkyee-local",
  trustedRootKind: "no-backup-files",
  verification: "native-adapter-observed"
};

const validIosObservation: NativeDirectoryObservation = {
  platform: "ios",
  expectedBundleId: "com.ikkyee.mobile",
  adapterBundleId: "com.ikkyee.mobile",
  trustedRootUri:
    "file:///var/mobile/Containers/Data/Application/01234567-89AB-CDEF-0123-456789ABCDEF/Library/Application%20Support",
  databaseDirectoryUri:
    "file:///var/mobile/Containers/Data/Application/01234567-89AB-CDEF-0123-456789ABCDEF/Library/Application%20Support/ikkyee-local",
  trustedRootKind: "application-support",
  verification: "native-adapter-observed",
  nativeBackupExclusion: "verified"
};

class SqlJsSchemaDatabase implements LocalSchemaDatabase {
  private readonly database: Database;

  public constructor(database: Database) {
    this.database = database;
  }

  public async execAsync(source: string): Promise<void> {
    this.database.run(source);
  }

  public async getUserVersion(): Promise<number> {
    const result = this.database.exec("PRAGMA user_version");
    const value = result[0]?.values[0]?.[0];
    if (typeof value !== "number") {
      throw new TypeError("SQLite user_version was not numeric");
    }
    return value;
  }

  public async getIntegrityResult(): Promise<string> {
    const value = scalar(this.database, "PRAGMA integrity_check");
    return typeof value === "string" ? value : "missing";
  }

  public async getForeignKeyViolationCount(): Promise<number> {
    return this.database.exec("PRAGMA foreign_key_check")[0]?.values.length ?? 0;
  }

  public async getSchemaObjectNames(type: LocalSchemaObjectType): Promise<readonly string[]> {
    const result = this.database.exec(
      `SELECT name FROM sqlite_master WHERE type = '${type}' ORDER BY name`
    );
    return (result[0]?.values ?? []).flatMap((row) =>
      typeof row[0] === "string" ? [row[0]] : []
    );
  }
}

function scalar(database: Database, source: string): number | string | null {
  const value = database.exec(source)[0]?.values[0]?.[0];
  if (value === undefined) {
    return null;
  }
  if (value instanceof Uint8Array) {
    throw new TypeError("Fixture query did not return a scalar");
  }
  return value;
}

function createReplacementStore(SQL: SqlJsStatic): { readonly store: LocalPhotoReplacementStore;
  readonly getDatabase: () => Database | null; readonly wasActivated: () => boolean;
  readonly wasDiscarded: () => boolean } {
  let database: Database | null = null;
  let activated = false;
  let discarded = false;
  return {
    store: {
      createReplacement: async () => {
        database = new SQL.Database();
        return new SqlJsSchemaDatabase(database);
      },
      activateReplacement: async () => {
        activated = true;
      },
      discardReplacement: async () => {
        discarded = true;
      }
    },
    getDatabase: () => database,
    wasActivated: () => activated,
    wasDiscarded: () => discarded
  };
}

if (process.env["JEST_WORKER_ID"] !== undefined) {
describe("local photo schema", () => {
  let SQL: SqlJsStatic;

  beforeAll(async () => {
    const sqlJs: typeof import("sql.js") = jest.requireActual("sql.js");
    SQL = await sqlJs.default();
    migrations = jest.requireActual<readonly LocalSchemaMigration[]>(
      "../src/local-schema-migrations.json"
    );
  });

  it("creates a fresh version-two account-independent schema", async () => {
    // Given: a new device-local SQLite database.
    const database = new SQL.Database();

    // When: all production migrations are applied.
    const result = await migrate(new SqlJsSchemaDatabase(database));

    // Then: the complete schema is present without an album or account relation.
    expect(result).toEqual({ fromVersion: 0, toVersion: 2 });
    expect(scalar(database, "PRAGMA user_version")).toBe(2);
    expect(
      scalar(
        database,
        "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name IN ('device_assets', 'sync_checkpoints', 'publication_jobs', 'tombstones')"
      )
    ).toBe(4);
    expect(
      scalar(database, "SELECT count(*) FROM sqlite_master WHERE lower(sql) LIKE '%album%'")
    ).toBe(0);
    expect(
      scalar(
        database,
        "SELECT count(*) FROM pragma_table_info('device_assets') WHERE lower(name) LIKE '%user%' OR lower(name) LIKE '%account%'"
      )
    ).toBe(0);
    expect(scalar(database, "PRAGMA foreign_key_check")).toBeNull();
    expect(scalar(database, "PRAGMA integrity_check")).toBe("ok");
    expect(
      scalar(database, "SELECT count(*) FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'")
    ).toBeGreaterThanOrEqual(6);
    expect(
      scalar(
        database,
        "SELECT count(*) FROM pragma_foreign_key_list('publication_jobs') WHERE \"table\" = 'device_assets' AND on_delete = 'SET NULL'"
      )
    ).toBe(1);
  });

  it("upgrades v1 while preserving private coordinates and checkpoint bytes", async () => {
    // Given: a v1 fixture containing precise private location and resume data.
    const database = new SQL.Database();
    await migrate(new SqlJsSchemaDatabase(database), migrations.slice(0, 1));
    database.run(
      "INSERT INTO device_assets(asset_id, uri, media_type, latitude, longitude, indexed_at) VALUES (?, ?, ?, ?, ?, ?)",
      ["device-private", "asset://private", "photo", 37.566535123456, 126.977969654321, "2026-08-20T00:00:00.000Z"]
    );
    database.run(
      "INSERT INTO sync_checkpoints(checkpoint_key, cursor, last_asset_id, updated_at) VALUES (?, ?, ?, ?)",
      ["library", "opaque-checkpoint-001", "device-private", "2026-08-20T00:01:00.000Z"]
    );

    // When: the remaining production migration is applied.
    const result = await migrate(new SqlJsSchemaDatabase(database));

    // Then: the exact private values survive the transaction unchanged.
    expect(result).toEqual({ fromVersion: 1, toVersion: 2 });
    expect(
      database.exec("SELECT latitude, longitude FROM device_assets WHERE asset_id = 'device-private'")[0]?.values[0]
    ).toEqual([37.566535123456, 126.977969654321]);
    expect(
      scalar(database, "SELECT cursor FROM sync_checkpoints WHERE checkpoint_key = 'library'")
    ).toBe("opaque-checkpoint-001");
  });

  it("rolls back a failed migration and permits a clean retry", async () => {
    // Given: a valid v2 database and an injected migration with an FK violation.
    const database = new SQL.Database();
    const adapter = new SqlJsSchemaDatabase(database);
    await migrate(adapter);
    const failingMigration: LocalSchemaMigration = {
      version: 3,
      name: "injected-failure",
      statements: [
        "CREATE TABLE interrupted_marker(id INTEGER PRIMARY KEY)",
        "INSERT INTO publication_jobs(job_id, device_asset_id, status, created_at, updated_at) VALUES ('bad-job', 'missing-asset', 'pending', '2026-08-20', '2026-08-20')"
      ]
    };

    // When: migration execution is interrupted by SQLite FK enforcement.
    await expect(migrate(adapter, [...migrations, failingMigration])).rejects.toThrow();

    // Then: both schema and version roll back, and production retry remains clean.
    expect(scalar(database, "PRAGMA user_version")).toBe(2);
    expect(
      scalar(database, "SELECT count(*) FROM sqlite_master WHERE name = 'interrupted_marker'")
    ).toBe(0);
    await expect(migrate(adapter)).resolves.toEqual({ fromVersion: 2, toVersion: 2 });
  });

  it("rejects malformed migration order and stale user versions", async () => {
    // Given: malformed migration input and a database newer than this application.
    const database = new SQL.Database();
    const adapter = new SqlJsSchemaDatabase(database);
    const malformed: readonly LocalSchemaMigration[] = [
      { version: 2, name: "out-of-order", statements: ["SELECT 1"] }
    ];

    // When: each invalid boundary is presented to the runner.
    const malformedResult = migrate(adapter, malformed);
    database.run("PRAGMA user_version = 99");
    const staleResult = migrate(adapter);

    // Then: neither input can report migration success.
    await expect(malformedResult).rejects.toThrow();
    await expect(staleResult).rejects.toThrow();
  });

  it("rebuilds corrupt local bytes and reports observed replacement state", async () => {
    // Given: corrupt bytes and an immutable OS asset source.
    const corruptBytes = new Uint8Array([1, 2, 3, 4]);
    const bytesBefore = Uint8Array.from(corruptBytes);
    const assets: readonly LocalPhotoReindexAsset[] = [{
      assetId: "device-original",
      uri: "asset://original",
      mediaType: "photo",
      fingerprint: "a".repeat(64)
    }];
    const assetsBefore = assets.map((asset) => ({ ...asset }));
    const replacement = createReplacementStore(SQL);
    let reindexedAssets: readonly LocalPhotoReindexAsset[] = [];

    // When: production recovery probes, migrates, reindexes, verifies, and activates a replacement.
    const result = await recover({
      corruptDatabaseBytes: corruptBytes,
      corruptionProbe: {
        isCorrupt: async (bytes) => {
          try {
            const corruptDatabase = new SQL.Database(bytes);
            corruptDatabase.exec("PRAGMA integrity_check");
            return false;
          } catch {
            return true;
          }
        }
      },
      assetSource: { readAssets: async () => assets },
      reindexer: { reindex: async (_database, sourceAssets) => { reindexedAssets = sourceAssets; } },
      replacementStore: replacement.store
    });

    // Then: replacement state is observed and original bytes/assets remain identical.
    const replacementDatabase = replacement.getDatabase();
    expect(replacementDatabase).not.toBeNull();
    if (replacementDatabase === null) {
      throw new TypeError("replacement database fixture was not created");
    }
    expect(result).toEqual({
      requiresReindex: true, originalAssetsTouched: false, reindexInvoked: true,
      replacementUserVersion: 2, replacementForeignKeyCheck: "ok",
      replacementIntegrityCheck: "ok", requiredTablesPresent: true,
      requiredIndexesPresent: true, originalBytesUnchanged: true,
      originalAssetSourceUnchanged: true
    });
    expect(reindexedAssets).toEqual(assets);
    expect(replacement.wasActivated()).toBe(true);
    expect(replacement.wasDiscarded()).toBe(false);
    expect(scalar(replacementDatabase, "PRAGMA user_version")).toBe(2);
    expect(corruptBytes).toEqual(bytesBefore);
    expect(assets).toEqual(assetsBefore);
  });

  it("discards a replacement when reindexing is interrupted", async () => {
    // Given: corrupt bytes and a replacement whose reindex callback fails.
    const replacement = createReplacementStore(SQL);
    const request: LocalPhotoRecoveryRequest = {
      corruptDatabaseBytes: new Uint8Array([1, 2, 3, 4]),
      corruptionProbe: { isCorrupt: async () => true },
      assetSource: { readAssets: async () => [] },
      reindexer: { reindex: async () => { throw new TypeError("injected reindex failure"); } },
      replacementStore: replacement.store
    };

    // When: production recovery is interrupted during reindex.
    await expect(recover(request)).rejects.toThrow("Local photo database recovery failed");

    // Then: the incomplete replacement is discarded and never activated.
    expect(replacement.wasDiscarded()).toBe(true);
    expect(replacement.wasActivated()).toBe(false);
    const retry = createReplacementStore(SQL);
    await expect(recover({
      ...request,
      reindexer: { reindex: async () => undefined },
      replacementStore: retry.store
    })).resolves.toMatchObject({ replacementUserVersion: 2, reindexInvoked: true });
    expect(retry.wasActivated()).toBe(true);
  });

  it("discards a stale replacement database before reindexing", async () => {
    // Given: a replacement factory that returns an unsupported future schema version.
    const replacement = createReplacementStore(SQL);
    const staleStore: LocalPhotoReplacementStore = {
      ...replacement.store,
      createReplacement: async () => {
        const database = await replacement.store.createReplacement();
        await database.execAsync("PRAGMA user_version = 99");
        return database;
      }
    };

    // When: production recovery attempts to migrate the stale replacement.
    const recovery = recover({
      corruptDatabaseBytes: new Uint8Array([1, 2, 3, 4]),
      corruptionProbe: { isCorrupt: async () => true },
      assetSource: { readAssets: async () => [] },
      reindexer: { reindex: async () => undefined }, replacementStore: staleStore
    });

    // Then: stale state is rejected and the replacement is discarded.
    await expect(recovery).rejects.toThrow("Local photo database recovery failed");
    expect(replacement.wasDiscarded()).toBe(true);
    expect(replacement.wasActivated()).toBe(false);
  });

  it("derives backup exclusion from a concrete platform directory", () => {
    // Given: Android no-backup storage and an ordinary backed-up documents path.
    const backedUp: NativeDirectoryObservation = {
      ...validAndroidObservation,
      trustedRootUri: "file:///data/user/0/com.ikkyee.mobile/Documents",
      databaseDirectoryUri: "file:///data/user/0/com.ikkyee.mobile/Documents/ikkyee-local"
    };
    const malformed: NativeDirectoryObservation = {
      ...validAndroidObservation,
      databaseDirectoryUri: "not-a-url"
    };

    // When: both concrete paths cross the platform policy boundary.
    const derived = deriveBackupExcludedDirectory(validAndroidObservation);

    // Then: only the platform no-backup directory yields the capability.
    expect(derived).toMatchObject({ backupExcluded: true, policy: "android-no-backup-files" });
    expect(() => deriveBackupExcludedDirectory(backedUp)).toThrow();
    expect(() => deriveBackupExcludedDirectory(malformed)).toThrow(
      "Local photo database directory must be platform-provided and backup-excluded"
    );
  });

  it.each([
    [
      "remote host",
      { databaseDirectoryUri: "file://attacker/data/user/0/com.ikkyee.mobile/no_backup/ikkyee-local" }
    ],
    [
      "arbitrary prefix",
      {
        trustedRootUri: "file:///ordinary/com.ikkyee.mobile/no_backup",
        databaseDirectoryUri: "file:///ordinary/com.ikkyee.mobile/no_backup/ikkyee-local"
      }
    ],
    [
      "encoded traversal",
      {
        trustedRootUri: "file:///ordinary/%2e%2e/data/user/0/com.ikkyee.mobile/no_backup",
        databaseDirectoryUri:
          "file:///ordinary/%2e%2e/data/user/0/com.ikkyee.mobile/no_backup/ikkyee-local"
      }
    ],
    [
      "double-encoded traversal",
      {
        trustedRootUri: "file:///ordinary/%252e%252e/com.ikkyee.mobile/no_backup",
        databaseDirectoryUri:
          "file:///ordinary/%252e%252e/com.ikkyee.mobile/no_backup/ikkyee-local"
      }
    ],
    [
      "ordinary documents",
      {
        trustedRootUri: "file:///data/user/0/com.ikkyee.mobile/Documents",
        databaseDirectoryUri: "file:///data/user/0/com.ikkyee.mobile/Documents/ikkyee-local"
      }
    ],
    ["mismatched app id", { adapterApplicationId: "com.other.app" }],
    [
      "sibling prefix",
      { databaseDirectoryUri: "file:///data/user/0/com.ikkyee.mobile/no_backup-sibling/ikkyee-local" }
    ],
    ["duplicate separator", { databaseDirectoryUri: "file:///data/user/0//com.ikkyee.mobile/no_backup/ikkyee-local" }],
    ["encoded separator", { databaseDirectoryUri: "file:///data/user/0/com.ikkyee.mobile/no_backup%2Fikkyee-local" }],
    ["backslash confusion", { databaseDirectoryUri: "file:///data/user/0/com.ikkyee.mobile/no_backup\\ikkyee-local" }],
    ["encoded NUL", { databaseDirectoryUri: "file:///data/user/0/com.ikkyee.mobile/no_backup/%00ikkyee-local" }]
  ])("rejects a forged backup directory with %s", (_label, changes) => {
    // Given: a native observation containing a forged URI or identity field.
    const forged: NativeDirectoryObservation = { ...validAndroidObservation, ...changes };

    // When: the forged URI crosses the production policy boundary.
    const derive = () => deriveBackupExcludedDirectory(forged);

    // Then: no backup-excluded capability is issued.
    expect(derive).toThrow("Local photo database directory must be platform-provided and backup-excluded");
  });

  it("derives iOS exclusion only from the observed Application Support root", () => {
    // Given: a verified native observation for the app's iOS container.
    // When: the trusted observation crosses the production policy boundary.
    const derived = deriveBackupExcludedDirectory(validIosObservation);

    // Then: the capability records the native exclusion policy without exposing path details.
    expect(derived).toMatchObject({ backupExcluded: true, policy: "ios-native-exclusion-verified" });
  });

  it("rejects an iOS observation whose adapter bundle identity differs", () => {
    // Given: an iOS observation with a native adapter identity mismatch.
    const forged: NativeDirectoryObservation = {
      ...validIosObservation,
      adapterBundleId: "com.other.app"
    };

    // When: the mismatched identity crosses the production policy boundary.
    const derive = () => deriveBackupExcludedDirectory(forged);

    // Then: no native backup-exclusion capability is issued.
    expect(derive).toThrow("Local photo database directory must be platform-provided and backup-excluded");
  });

  it("rejects a forged directory before opening Expo SQLite", async () => {
    // Given: an otherwise valid observation whose database URI has a remote authority.
    const forged: NativeDirectoryObservation = {
      ...validAndroidObservation,
      databaseDirectoryUri: "file://attacker/data/user/0/com.ikkyee.mobile/no_backup/ikkyee-local"
    };

    // When: the production open boundary receives the observation.
    const opening = loadDatabaseModule().openLocalPhotoDatabase({
      databaseName: "local-photo.db",
      directoryObservation: forged
    });

    // Then: policy rejection occurs before the runtime adapter can open a database.
    await expect(opening).rejects.toThrow(
      "Local photo database directory must be platform-provided and backup-excluded"
    );
  });
});
}
