import type { Database, SqlJsStatic } from "sql.js";

import { createPublicationJobRepository } from "../src/publication-job-repository";
import migrations from "../src/local-schema-migrations.json";

class SqlJsAdapter {
  public constructor(private readonly database: Database) {}
  async runAsync(source: string, params: readonly unknown[] = []) {
    this.database.run(source, params as never[]);
    return { changes: this.database.getRowsModified() };
  }
  async getFirstAsync<T>(source: string, params: readonly unknown[] = []): Promise<T | null> {
    const statement = this.database.prepare(source);
    try {
      statement.bind(params as never[]);
      return statement.step() ? statement.getAsObject() as T : null;
    } finally { statement.free(); }
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
}

describe("SQLite publication job repository", () => {
  let SQL: SqlJsStatic;
  beforeAll(async () => {
    const sqlJs: typeof import("sql.js") = jest.requireActual("sql.js");
    SQL = await sqlJs.default();
  });

  it("persists safe metadata and schedules at most three attempts", async () => {
    const database = new SQL.Database();
    for (const migration of migrations) for (const statement of migration.statements) database.run(statement);
    database.run("INSERT INTO device_assets(asset_id, uri, media_type, indexed_at) VALUES ('asset-a', 'asset-a', 'photo', '2026-08-24')");
    const repository = createPublicationJobRepository(new SqlJsAdapter(database));
    const job = await repository.enqueue({
      jobId: "job-a",
      deviceAssetId: "asset-a",
      intent: "link",
      objectPath: "owner/job-a.jpg",
      photoId: "job-a",
      shareToken: "a".repeat(64),
      createdAt: 1_000
    });

    expect(job.status).toBe("pending");
    expect(job.payload.shareToken).toBe("a".repeat(64));
    expect(JSON.stringify(job)).not.toContain("file:///cache");
    await expect(repository.markRunning("job-a", 2_000)).resolves.toBe(1);
    await expect(repository.findOpen("asset-a", "link")).resolves.toMatchObject({ jobId: "job-a" });
    await expect(repository.recoverInterrupted(10_000)).resolves.toBe(1);
    await expect(repository.get("job-a")).resolves.toMatchObject({
      attempts: 1,
      status: "failed",
      nextAttemptAt: 70_000
    });
    await expect(repository.markRunning("job-a", 2_000)).resolves.toBe(2);
    await repository.markFailed("job-a", 2, 2_000);
    await expect(repository.get("job-a")).resolves.toMatchObject({
      attempts: 2,
      status: "failed",
      nextAttemptAt: 302_000
    });
    await expect(repository.listRetryable(301_999)).resolves.toEqual([]);
    await expect(repository.listRetryable(302_000)).resolves.toHaveLength(1);
    await expect(repository.getLatestRetryableForAsset("asset-a")).resolves.toMatchObject({
      jobId: "job-a",
      attempts: 2
    });
    await expect(repository.markRunning("job-a", 364_000)).resolves.toBe(3);
    await repository.markFailed("job-a", 3, 364_000);
    await expect(repository.get("job-a")).resolves.toMatchObject({
      attempts: 3,
      status: "failed",
      nextAttemptAt: null
    });
    await expect(repository.listRetryable(999_999)).resolves.toEqual([]);
    await expect(repository.getLatestRetryableForAsset("asset-a")).resolves.toBeNull();
  });

  it("finds and clears only a succeeded publication after remote deletion", async () => {
    const database = new SQL.Database();
    for (const migration of migrations) for (const statement of migration.statements) database.run(statement);
    database.run("INSERT INTO device_assets(asset_id, uri, media_type, indexed_at) VALUES ('asset-a', 'asset-a', 'photo', '2026-08-24')");
    const repository = createPublicationJobRepository(new SqlJsAdapter(database));
    await repository.enqueue({
      jobId: "job-succeeded", deviceAssetId: "asset-a", intent: "public",
      objectPath: "owner/job-succeeded.jpg", photoId: "job-succeeded", createdAt: 1_000
    });
    await repository.markSucceeded("job-succeeded", 2_000);
    await repository.enqueue({
      jobId: "job-pending", deviceAssetId: "asset-a", intent: "private",
      objectPath: "owner/job-pending.jpg", photoId: "job-pending", createdAt: 3_000
    });

    await expect(repository.getLatestSucceededForAsset("asset-a"))
      .resolves.toMatchObject({ jobId: "job-succeeded", status: "succeeded" });
    await repository.deleteSucceeded("job-succeeded");
    await expect(repository.getLatestSucceededForAsset("asset-a")).resolves.toBeNull();
    await expect(repository.get("job-pending")).resolves.toMatchObject({ status: "pending" });
  });
});
