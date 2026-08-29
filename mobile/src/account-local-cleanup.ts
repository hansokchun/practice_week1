import { devicePhotoThumbnailCache } from "./device-photo-thumbnail-cache";
import { openLocalPhotoDatabase } from "./local-photo-database";
import { nativeLocalPhotoStorage } from "./native-local-photo-storage";
import { publicationDerivativeRuntime } from "./publication-derivative-runtime";

type CleanupDatabase = {
  readonly exec: (sql: string) => Promise<void>;
  readonly close: () => Promise<void>;
};

export type AccountLocalCleanupDependencies = {
  readonly openDatabase: () => Promise<CleanupDatabase>;
  readonly clearThumbnails: () => Promise<void>;
  readonly clearDerivatives: () => Promise<unknown>;
};

const CLEANUP_SQL = `
BEGIN IMMEDIATE;
DELETE FROM publication_jobs;
DELETE FROM tombstones;
DELETE FROM sync_checkpoints;
DELETE FROM device_assets;
COMMIT;
`;

const defaultDependencies: AccountLocalCleanupDependencies = {
  async openDatabase() {
    const directoryObservation = await nativeLocalPhotoStorage.getDatabaseDirectoryObservation();
    const handle = await openLocalPhotoDatabase({
      databaseName: "ikkyee-local.db",
      directoryObservation
    });
    return {
      exec: (sql) => handle.database.execAsync(sql),
      close: () => handle.database.closeAsync()
    };
  },
  clearThumbnails: () => devicePhotoThumbnailCache.clear(),
  clearDerivatives: () => publicationDerivativeRuntime.clear()
};

export async function clearLocalAccountData(
  dependencies: AccountLocalCleanupDependencies = defaultDependencies
): Promise<void> {
  let database: CleanupDatabase | null = null;
  try {
    database = await dependencies.openDatabase();
    try {
      await database.exec(CLEANUP_SQL);
    } catch {
      await database.exec("ROLLBACK").catch(() => undefined);
      throw new Error("local database cleanup failed");
    } finally {
      await database.close();
    }
    await dependencies.clearThumbnails();
    await dependencies.clearDerivatives();
  } catch {
    throw new Error("기기 데이터를 정리하지 못했습니다.");
  }
}
