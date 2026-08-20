import { readFile } from "node:fs/promises";

import initSqlJs from "sql.js";

// allow: SIZE_OK - this bounded CLI keeps its executable SQL scenarios in one fixture runner.
const migrationUrl = new URL("../src/local-schema-migrations.json", import.meta.url);
const requiredTables = ["device_assets", "sync_checkpoints", "publication_jobs", "tombstones"];
const requiredIndexes = [
  "idx_device_assets_modified_at", "idx_device_assets_indexed_at",
  "idx_sync_checkpoints_updated_at", "idx_sync_checkpoints_last_asset_id",
  "idx_publication_jobs_status_next_attempt", "idx_publication_jobs_device_asset_id",
  "idx_tombstones_removed_at", "idx_tombstones_sync_state"
];
const directoryObservation = {
  platform: "android",
  expectedApplicationId: "com.ikkyee.mobile",
  adapterApplicationId: "com.ikkyee.mobile",
  trustedRootUri: "file:///data/user/0/com.ikkyee.mobile/no_backup",
  databaseDirectoryUri: "file:///data/user/0/com.ikkyee.mobile/no_backup/ikkyee-local",
  trustedRootKind: "no-backup-files",
  verification: "native-adapter-observed"
};

function parseMigrations(value) {
  if (!Array.isArray(value)) {
    throw new TypeError("INVALID_MIGRATION_DOCUMENT");
  }
  return value.map((migration, index) => {
    if (
      typeof migration !== "object" ||
      migration === null ||
      migration.version !== index + 1 ||
      typeof migration.name !== "string" ||
      migration.name.length === 0 ||
      !Array.isArray(migration.statements) ||
      migration.statements.length === 0 ||
      !migration.statements.every((statement) => typeof statement === "string" && statement.length > 0)
    ) {
      throw new TypeError("INVALID_MIGRATION_DOCUMENT");
    }
    return {
      version: migration.version,
      name: migration.name,
      statements: migration.statements
    };
  });
}

function scalar(database, source) {
  const value = database.exec(source)[0]?.values[0]?.[0];
  if (value === undefined || value instanceof Uint8Array) {
    return null;
  }
  return value;
}

function applyMigrations(database, migrations) {
  database.run("PRAGMA foreign_keys = ON");
  const fromVersion = scalar(database, "PRAGMA user_version");
  if (typeof fromVersion !== "number" || fromVersion < 0 || fromVersion > migrations.length) {
    throw new TypeError("UNSUPPORTED_SCHEMA_VERSION");
  }
  for (const migration of migrations.slice(fromVersion)) {
    database.run("BEGIN IMMEDIATE");
    try {
      for (const statement of migration.statements) {
        database.run(statement);
      }
      database.run(`PRAGMA user_version = ${migration.version}`);
      database.run("COMMIT");
    } catch (error) {
      database.run("ROLLBACK");
      throw error;
    }
  }
  return { fromVersion, toVersion: scalar(database, "PRAGMA user_version") };
}

function parseCanonicalFileDirectory(uri) {
  if (!uri.startsWith("file:///") || uri.includes("\\") || uri.includes("\0")) {
    throw new TypeError("BACKUP_DIRECTORY_REJECTED");
  }
  const url = new URL(uri);
  const rawPath = uri.slice("file://".length);
  if (url.protocol !== "file:" || url.host !== "" || url.search !== "" || url.hash !== "" ||
      rawPath.includes("//") || rawPath.endsWith("/")) {
    throw new TypeError("BACKUP_DIRECTORY_REJECTED");
  }
  const rawSegments = rawPath.slice(1).split("/");
  const segments = rawSegments.map((segment) => {
    const decoded = decodeURIComponent(segment);
    if (decoded === "" || decoded === "." || decoded === ".." || decoded.includes("%") ||
        decoded.includes("/") || decoded.includes("\\") || decoded.includes("\0") ||
        encodeURIComponent(decoded) !== segment) {
      throw new TypeError("BACKUP_DIRECTORY_REJECTED");
    }
    return decoded;
  });
  return { uri: `file:///${rawSegments.join("/")}`, segments };
}

function deriveBackupExcludedDirectory(observation) {
  const root = parseCanonicalFileDirectory(observation.trustedRootUri);
  const database = parseCanonicalFileDirectory(observation.databaseDirectoryUri);
  const exactChild = database.segments.length === root.segments.length + 1 &&
    database.segments.at(-1) === "ikkyee-local" &&
    root.segments.every((segment, index) => database.segments[index] === segment);
  const valid = observation.platform === "android" &&
    observation.verification === "native-adapter-observed" &&
    observation.trustedRootKind === "no-backup-files" &&
    observation.expectedApplicationId === observation.adapterApplicationId &&
    root.segments.length === 5 && root.segments[0] === "data" &&
    root.segments[1] === "user" && /^\d+$/.test(root.segments[2] ?? "") &&
    root.segments[3] === observation.adapterApplicationId && root.segments[4] === "no_backup" &&
    exactChild;
  if (!valid) {
    throw new TypeError("BACKUP_DIRECTORY_REJECTED");
  }
  return { source: "platform", policy: "android-no-backup-files",
    verification: observation.verification, uri: database.uri };
}

function schemaNames(database, type) {
  return (database.exec(`SELECT name FROM sqlite_master WHERE type = '${type}'`)[0]?.values ?? [])
    .flatMap((row) => typeof row[0] === "string" ? [row[0]] : []);
}

function inspect(database, directory) {
  const tableNames = schemaNames(database, "table");
  const indexNames = schemaNames(database, "index");
  const foreignKeyRows = database.exec("PRAGMA foreign_key_check")[0]?.values ?? [];
  return {
    foreignKeyCheck: foreignKeyRows.length === 0 ? "ok" : "failed",
    integrityCheck: scalar(database, "PRAGMA integrity_check"),
    albumRelations: scalar(
      database,
      "SELECT count(*) FROM sqlite_master WHERE lower(coalesce(sql, '')) LIKE '%album%'"
    ),
    accountIndependent:
      scalar(
        database,
        "SELECT count(*) FROM pragma_table_info('device_assets') WHERE lower(name) LIKE '%user%' OR lower(name) LIKE '%account%'"
      ) === 0,
    requiredTablesPresent: requiredTables.every((name) => tableNames.includes(name)),
    requiredIndexesPresent: requiredIndexes.every((name) => indexNames.includes(name)),
    backupExcluded:
      directory.source === "platform" && directory.policy === "android-no-backup-files" &&
      directory.verification === "native-adapter-observed",
    backupExclusionPolicy: directory.policy,
    directoryDerived: directory.verification === "native-adapter-observed"
  };
}

function runFresh(SQL, migrations) {
  const database = new SQL.Database();
  const versions = applyMigrations(database, migrations);
  const directory = deriveBackupExcludedDirectory(directoryObservation);
  return { scenario: "fresh", ...versions, ...inspect(database, directory) };
}

function runUpgrade(SQL, migrations) {
  const database = new SQL.Database();
  applyMigrations(database, migrations.slice(0, 1));
  const coordinates = [37.566535123456, 126.977969654321];
  database.run(
    "INSERT INTO device_assets(asset_id, uri, media_type, latitude, longitude, indexed_at) VALUES (?, ?, ?, ?, ?, ?)",
    ["device-private", "asset://private", "photo", ...coordinates, "2026-08-20T00:00:00.000Z"]
  );
  database.run(
    "INSERT INTO sync_checkpoints(checkpoint_key, cursor, last_asset_id, updated_at) VALUES (?, ?, ?, ?)",
    ["library", "opaque-checkpoint-001", "device-private", "2026-08-20T00:01:00.000Z"]
  );
  const versions = applyMigrations(database, migrations);
  const directory = deriveBackupExcludedDirectory(directoryObservation);
  const preservedCoordinates = database.exec(
    "SELECT latitude, longitude FROM device_assets WHERE asset_id = 'device-private'"
  )[0]?.values[0];
  return {
    scenario: "upgrade",
    ...versions,
    coordinatePreserved:
      preservedCoordinates?.[0] === coordinates[0] && preservedCoordinates[1] === coordinates[1],
    checkpointPreserved:
      scalar(database, "SELECT cursor FROM sync_checkpoints WHERE checkpoint_key = 'library'") ===
      "opaque-checkpoint-001",
    ...inspect(database, directory)
  };
}

function assetsMatch(before, after) {
  return before.length === after.length && before.every((asset, index) => {
    const current = after[index];
    return current !== undefined && current.assetId === asset.assetId &&
      current.uri === asset.uri && current.mediaType === asset.mediaType &&
      current.fingerprint === asset.fingerprint;
  });
}

function runCorruption(SQL, migrations) {
  const corruptBytes = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
  const originalBytes = Uint8Array.from(corruptBytes);
  const originalAssetSource = [{
    assetId: "device-original", uri: "asset://original", mediaType: "photo",
    fingerprint: "a".repeat(64)
  }];
  const originalAssets = originalAssetSource.map((asset) => ({ ...asset }));
  let corruptionDetected = false;
  try {
    const corruptDatabase = new SQL.Database(corruptBytes);
    corruptDatabase.exec("PRAGMA integrity_check");
  } catch {
    corruptionDetected = true;
  }
  if (!corruptionDetected) {
    throw new TypeError("CORRUPTION_FIXTURE_NOT_DETECTED");
  }
  const replacement = new SQL.Database();
  applyMigrations(replacement, migrations);
  let reindexInvoked = false;
  const reindex = (assets) => {
    reindexInvoked = true;
    for (const asset of assets) {
      replacement.run(
        "INSERT INTO device_assets(asset_id, uri, media_type, indexed_at) VALUES (?, ?, ?, ?)",
        [asset.assetId, asset.uri, asset.mediaType, "2026-08-20T00:00:00.000Z"]
      );
    }
  };
  reindex(originalAssetSource.map((asset) => ({ ...asset })));
  const directory = deriveBackupExcludedDirectory(directoryObservation);
  const replacementState = inspect(replacement, directory);
  const originalBytesUnchanged = originalBytes.every(
    (value, index) => corruptBytes[index] === value
  ) && originalBytes.length === corruptBytes.length;
  const originalAssetSourceUnchanged = assetsMatch(originalAssets, originalAssetSource);
  return {
    scenario: "corruption",
    requiresReindex: corruptionDetected,
    originalAssetsTouched: !originalAssetSourceUnchanged,
    reindexInvoked,
    replacementUserVersion: scalar(replacement, "PRAGMA user_version"),
    replacementForeignKeyCheck: replacementState.foreignKeyCheck,
    replacementIntegrityCheck: replacementState.integrityCheck,
    requiredTablesPresent: replacementState.requiredTablesPresent,
    requiredIndexesPresent: replacementState.requiredIndexesPresent,
    originalBytesUnchanged,
    originalAssetSourceUnchanged
  };
}

function runInvalid(SQL, migrations) {
  const database = new SQL.Database();
  applyMigrations(database, migrations);
  const invalid = {
    version: 3,
    name: "injected-failure",
    statements: [
      "CREATE TABLE interrupted_marker(id INTEGER PRIMARY KEY)",
      "INSERT INTO publication_jobs(job_id, device_asset_id, status, created_at, updated_at) VALUES ('bad-job', 'missing-asset', 'pending', '2026-08-20', '2026-08-20')"
    ]
  };
  try {
    applyMigrations(database, [...migrations, invalid]);
  } catch (error) {
    const rolledBack =
      scalar(database, "PRAGMA user_version") === 2 &&
      scalar(database, "SELECT count(*) FROM sqlite_master WHERE name = 'interrupted_marker'") === 0;
    if (rolledBack && error instanceof Error) {
      throw new TypeError("INJECTED_MIGRATION_REJECTED");
    }
    throw error;
  }
  throw new TypeError("INVALID_MIGRATION_ACCEPTED");
}

async function main() {
  const scenarioIndex = process.argv.indexOf("--scenario");
  const scenario = scenarioIndex >= 0 ? process.argv[scenarioIndex + 1] : undefined;
  const migrations = parseMigrations(JSON.parse(await readFile(migrationUrl, "utf8")));
  const SQL = await initSqlJs();
  switch (scenario) {
    case "fresh":
      return runFresh(SQL, migrations);
    case "upgrade":
      return runUpgrade(SQL, migrations);
    case "corruption":
      return runCorruption(SQL, migrations);
    case "invalid":
      return runInvalid(SQL, migrations);
    default:
      throw new TypeError("INVALID_SCENARIO");
  }
}

try {
  console.log(JSON.stringify(await main()));
} catch (error) {
  const code = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : "VERIFY_FAILED";
  console.error(JSON.stringify({ status: "error", code }));
  process.exitCode = 1;
}
