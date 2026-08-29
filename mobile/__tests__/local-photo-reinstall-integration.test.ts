import type { Database, SqlJsStatic } from "sql.js";

import {
  createDevicePhotoGridRepository,
  createSQLiteDevicePhotoScanStore
} from "../src/device-photo-repository";
import { pruneTombstonedDevicePhotoThumbnails } from "../src/device-photo-thumbnail-cleanup";
import { scanDevicePhotoLibrary } from "../src/device-photo-scan";
import migrations from "../src/local-schema-migrations.json";

class SqlJsPhotoDatabase {
  public constructor(private readonly database: Database) {}
  async runAsync(source: string, params: readonly unknown[] = []) {
    this.database.run(source, params as never[]);
    return { changes: this.database.getRowsModified(), lastInsertRowId: 0 };
  }
  async getAllAsync<T>(source: string, params: readonly unknown[] = []): Promise<T[]> {
    const statement = this.database.prepare(source);
    try {
      statement.bind(params as never[]);
      const rows: T[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as T);
      return rows;
    } finally { statement.free(); }
  }
  async getFirstAsync<T>(source: string, params: readonly unknown[] = []): Promise<T | null> {
    return (await this.getAllAsync<T>(source, params))[0] ?? null;
  }
  async withExclusiveTransactionAsync(task: (database: SqlJsPhotoDatabase) => Promise<void>) {
    this.database.run("BEGIN IMMEDIATE");
    try {
      await task(this);
      this.database.run("COMMIT");
    } catch (cause) {
      this.database.run("ROLLBACK");
      throw cause;
    }
  }
}

describe("local photo reinstall and OS deletion lifecycle", () => {
  let SQL: SqlJsStatic;
  beforeAll(async () => {
    const sqlJs: typeof import("sql.js") = jest.requireActual("sql.js");
    SQL = await sqlJs.default();
  });

  function freshDatabase() {
    const raw = new SQL.Database();
    raw.run("PRAGMA foreign_keys = ON");
    for (const migration of migrations) for (const statement of migration.statements) raw.run(statement);
    return new SqlJsPhotoDatabase(raw);
  }

  it("rebuilds an empty reinstall from immutable OS references and prunes only app caches after OS deletion", async () => {
    const osAssets = [{
      id: "asset-original", filename: "trip.jpg", width: 1200, height: 900,
      creationTime: 1_000, modificationTime: 2_000
    }];
    const osSnapshot = osAssets.map((asset) => ({ ...asset }));
    const firstInstall = freshDatabase();
    await scanDevicePhotoLibrary({
      now: () => "2026-08-25T01:00:00.000Z",
      source: { listPhotoPage: async ({ offset, limit }) => osAssets.slice(offset, offset + limit) },
      store: createSQLiteDevicePhotoScanStore(firstInstall)
    });
    await expect(createDevicePhotoGridRepository(firstInstall).listPhotos())
      .resolves.toEqual([expect.objectContaining({ id: "asset-original" })]);

    const reinstalled = freshDatabase();
    await scanDevicePhotoLibrary({
      now: () => "2026-08-25T02:00:00.000Z",
      source: { listPhotoPage: async ({ offset, limit }) => osAssets.slice(offset, offset + limit) },
      store: createSQLiteDevicePhotoScanStore(reinstalled)
    });
    await expect(createDevicePhotoGridRepository(reinstalled).listPhotos())
      .resolves.toEqual([expect.objectContaining({ id: "asset-original" })]);
    await expect(reinstalled.getAllAsync("SELECT job_id FROM publication_jobs")).resolves.toEqual([]);

    const deletedFromOs: typeof osAssets = [];
    const deletionScan = await scanDevicePhotoLibrary({
      now: () => "2026-08-25T03:00:00.000Z",
      source: { listPhotoPage: async () => deletedFromOs },
      store: createSQLiteDevicePhotoScanStore(reinstalled)
    });
    expect(deletionScan.removedAssetCount).toBe(1);
    const removeThumbnail = jest.fn(async () => undefined);
    await expect(pruneTombstonedDevicePhotoThumbnails(reinstalled, { remove: removeThumbnail }))
      .resolves.toEqual({ removedThumbnailCount: 1 });
    expect(removeThumbnail).toHaveBeenCalledWith("asset-original");
    expect(osAssets).toEqual(osSnapshot);
  });
});
