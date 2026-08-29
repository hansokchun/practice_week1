import type { Database, SqlJsStatic } from "sql.js";

import {
  createDevicePhotoDetailRepository,
  createDevicePhotoGridRepository,
  createDevicePhotoLocationRepository,
  createDevicePhotoMetadataRepository,
  createSQLiteDevicePhotoScanStore
} from "../src/device-photo-repository";
import migrations from "../src/local-schema-migrations.json";

class SqlJsDevicePhotoDatabase {
  public constructor(private readonly database: Database) {}

  public async runAsync(source: string, params: readonly unknown[] = []) {
    this.database.run(source, params as never[]);
    return { changes: this.database.getRowsModified(), lastInsertRowId: 0 };
  }

  public async getAllAsync<T>(source: string, params: readonly unknown[] = []): Promise<T[]> {
    const statement = this.database.prepare(source);
    try {
      statement.bind(params as never[]);
      const rows: T[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as T);
      return rows;
    } finally {
      statement.free();
    }
  }

  public async getFirstAsync<T>(source: string, params: readonly unknown[] = []): Promise<T | null> {
    return (await this.getAllAsync<T>(source, params))[0] ?? null;
  }

  public async withExclusiveTransactionAsync(task: (transaction: SqlJsDevicePhotoDatabase) => Promise<void>) {
    this.database.run("BEGIN IMMEDIATE");
    try {
      await task(this);
      this.database.run("COMMIT");
    } catch (error) {
      this.database.run("ROLLBACK");
      throw error;
    }
  }
}

describe("SQLite device photo scan store", () => {
  let SQL: SqlJsStatic;

  beforeAll(async () => {
    const sqlJs: typeof import("sql.js") = jest.requireActual("sql.js");
    SQL = await sqlJs.default();
  });

  it("persists checkpoints and tombstones assets missing from a completed scan", async () => {
    const database = new SQL.Database();
    database.run("PRAGMA foreign_keys = ON");
    for (const migration of migrations) {
      for (const statement of migration.statements) database.run(statement);
    }
    const adapter = new SqlJsDevicePhotoDatabase(database);
    const store = createSQLiteDevicePhotoScanStore(adapter);
    const firstScan = "2026-08-24T10:00:00.000Z";

    await store.persistPage([
      { id: "asset-a", filename: "a.jpg", width: 1200, height: 1500, creationTime: 1000, modificationTime: 2000 },
      { id: "asset-b", filename: "b.jpg", width: 800, height: 600, creationTime: 3000, modificationTime: 4000 }
    ], {
      offset: 2,
      lastAssetId: "asset-b",
      processedAssetCount: 2,
      scanStartedAt: firstScan
    });

    await expect(store.getCheckpoint()).resolves.toEqual({
      offset: 2,
      lastAssetId: "asset-b",
      processedAssetCount: 2,
      scanStartedAt: firstScan
    });
    await expect(store.completeScan(firstScan)).resolves.toBe(0);

    const secondScan = "2026-08-24T11:00:00.000Z";
    await store.persistPage([
      { id: "asset-b", filename: "b.jpg", width: 900, height: 700, creationTime: 3000, modificationTime: 5000 }
    ], {
      offset: 1,
      lastAssetId: "asset-b",
      processedAssetCount: 1,
      scanStartedAt: secondScan
    });
    await expect(store.completeScan(secondScan)).resolves.toBe(1);

    await expect(adapter.getAllAsync("SELECT asset_id, width, height FROM device_assets ORDER BY asset_id"))
      .resolves.toEqual([{ asset_id: "asset-b", width: 900, height: 700 }]);
    await expect(adapter.getAllAsync("SELECT asset_id, reason FROM tombstones ORDER BY asset_id"))
      .resolves.toEqual([{ asset_id: "asset-a", reason: "device-original-missing" }]);
    await expect(store.getCheckpoint()).resolves.toBeNull();
  });

  it("stores sanitized metadata and invalidates it when the OS asset changes", async () => {
    const database = new SQL.Database();
    for (const migration of migrations) {
      for (const statement of migration.statements) database.run(statement);
    }
    const adapter = new SqlJsDevicePhotoDatabase(database);
    const scanStore = createSQLiteDevicePhotoScanStore(adapter);
    const metadataRepository = createDevicePhotoMetadataRepository(adapter);
    await scanStore.persistPage([{
      id: "asset-live",
      filename: "live.heic",
      width: 1200,
      height: 900,
      creationTime: 1000,
      modificationTime: 2000
    }], {
      offset: 1,
      lastAssetId: "asset-live",
      processedAssetCount: 1,
      scanStartedAt: "2026-08-24T12:00:00.000Z"
    });

    await metadataRepository.saveMetadata("asset-live", {
      mediaType: "live_photo",
      capturedAt: "2024-03-05T14:06:07",
      latitude: 37.5,
      longitude: 126.9,
      exifJson: '{"Make":"Camera Corp"}'
    });
    await expect(metadataRepository.getPendingAssetIds(60)).resolves.toEqual([]);

    await scanStore.persistPage([{
      id: "asset-live",
      filename: "live.heic",
      width: 1200,
      height: 900,
      creationTime: 1000,
      modificationTime: 3000
    }], {
      offset: 1,
      lastAssetId: "asset-live",
      processedAssetCount: 1,
      scanStartedAt: "2026-08-24T13:00:00.000Z"
    });

    await expect(metadataRepository.getPendingAssetIds(60)).resolves.toEqual(["asset-live"]);
    await expect(adapter.getFirstAsync<{
      readonly media_type: string;
      readonly latitude: number | null;
      readonly exif_json: string | null;
    }>("SELECT media_type, latitude, exif_json FROM device_assets WHERE asset_id = ?", ["asset-live"]))
      .resolves.toEqual({ media_type: "photo", latitude: null, exif_json: null });
  });

  it("reads the newest indexed photos from SQLite with bounded pagination", async () => {
    const database = new SQL.Database();
    for (const migration of migrations) {
      for (const statement of migration.statements) database.run(statement);
    }
    const adapter = new SqlJsDevicePhotoDatabase(database);
    const scanStore = createSQLiteDevicePhotoScanStore(adapter);
    await scanStore.persistPage([
      { id: "asset-older", filename: "older.jpg", width: 800, height: 600, creationTime: 1_000, modificationTime: 2_000 },
      { id: "asset-newer", filename: "newer.jpg", width: 1200, height: 900, creationTime: 3_000, modificationTime: 4_000 },
      { id: "asset-undated", filename: "undated.jpg", width: null, height: null, creationTime: null, modificationTime: null }
    ], {
      offset: 3,
      lastAssetId: "asset-undated",
      processedAssetCount: 3,
      scanStartedAt: "2026-08-24T14:00:00.000Z"
    });
    await createDevicePhotoMetadataRepository(adapter).saveMetadata("asset-older", {
      mediaType: "photo",
      capturedAt: null,
      latitude: 33.4996,
      longitude: 126.5312,
      exifJson: "{}"
    });

    const repository = createDevicePhotoGridRepository(adapter);

    await expect(repository.listPhotos({ limit: 1, offset: 0 })).resolves.toEqual([{
      id: "asset-newer",
      filename: null,
      width: 1200,
      height: 900,
      creationTime: 3_000,
      modificationTime: 4_000,
      latitude: null,
      longitude: null
    }]);
    await expect(repository.listPhotos({ limit: 2, offset: 1 })).resolves.toEqual([
      {
        id: "asset-older",
        filename: null,
        width: 800,
        height: 600,
        creationTime: 1_000,
        modificationTime: 2_000,
        latitude: 33.4996,
        longitude: 126.5312
      },
      {
        id: "asset-undated",
        filename: null,
        width: null,
        height: null,
        creationTime: null,
        modificationTime: null,
        latitude: null,
        longitude: null
      }
    ]);
    await expect(repository.listLocatedPhotos({ limit: 500 })).resolves.toEqual([{
      id: "asset-older",
      filename: null,
      width: 800,
      height: 600,
      creationTime: 1_000,
      modificationTime: 2_000,
      latitude: 33.4996,
      longitude: 126.5312
    }]);

    await expect(createDevicePhotoDetailRepository(adapter).getPhoto("asset-older"))
      .resolves.toEqual({
        id: "asset-older",
        mediaType: "photo",
        width: 800,
        height: 600,
        capturedAt: 1_000,
        modifiedAt: 2_000,
        hasPrivateLocation: true,
        publicationState: "not-published"
      });

    await adapter.runAsync(
      `INSERT INTO publication_jobs(
        job_id, device_asset_id, status, created_at, updated_at
      ) VALUES (?, ?, 'failed', ?, ?)`,
      ["job-latest", "asset-older", "2026-08-24T15:00:00.000Z", "2026-08-24T15:00:00.000Z"]
    );
    await expect(createDevicePhotoDetailRepository(adapter).getPhoto("asset-older"))
      .resolves.toMatchObject({ publicationState: "failed" });

    const locationRepository = createDevicePhotoLocationRepository(adapter);
    await expect(locationRepository.getLocation("asset-newer")).resolves.toBeNull();
    await locationRepository.saveLocation("asset-newer", { latitude: 35.1796, longitude: 129.0756 });
    await expect(locationRepository.getLocation("asset-newer")).resolves.toEqual({
      latitude: 35.1796,
      longitude: 129.0756
    });
  });
});
