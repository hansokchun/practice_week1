import { CryptoDigestAlgorithm, digestStringAsync } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import {
  createThumbnailCache,
  type ThumbnailCacheEntry,
  type ThumbnailCacheStorage,
  type ThumbnailRenderer
} from "./thumbnail-cache";

type ThumbnailIndexEntry = {
  readonly byteSize: number;
  readonly lastAccessedAt: number;
};

type ThumbnailIndex = {
  readonly version: 1;
  readonly entries: Record<string, ThumbnailIndexEntry>;
};

const CACHE_DIRECTORY_NAME = "ikkyee-thumbnails";
const INDEX_FILE_NAME = "index.json";
const THUMBNAIL_LONG_EDGE = 512;

function emptyIndex(): ThumbnailIndex {
  return { version: 1, entries: {} };
}

function parseIndex(value: unknown): ThumbnailIndex {
  if (typeof value !== "object" || value === null) return emptyIndex();
  const record = value as Record<string, unknown>;
  if (record["version"] !== 1 || typeof record["entries"] !== "object" || record["entries"] === null) {
    return emptyIndex();
  }
  const entries: Record<string, ThumbnailIndexEntry> = {};
  for (const [key, candidate] of Object.entries(record["entries"])) {
    if (!/^[a-f0-9]{64}$/.test(key) || typeof candidate !== "object" || candidate === null) continue;
    const entry = candidate as Record<string, unknown>;
    const byteSize = entry["byteSize"];
    const lastAccessedAt = entry["lastAccessedAt"];
    if (
      typeof byteSize === "number" && Number.isFinite(byteSize) && byteSize > 0 &&
      typeof lastAccessedAt === "number" && Number.isFinite(lastAccessedAt) && lastAccessedAt >= 0
    ) entries[key] = { byteSize, lastAccessedAt };
  }
  return { version: 1, entries };
}

class ExpoThumbnailCacheStorage implements ThumbnailCacheStorage {
  private readonly directory = new Directory(Paths.cache, CACHE_DIRECTORY_NAME);
  private indexPromise: Promise<ThumbnailIndex> | null = null;
  private mutationTail: Promise<void> = Promise.resolve();

  private ensureDirectory(): void {
    this.directory.create({ idempotent: true, intermediates: true });
  }

  private thumbnailFile(key: string): File {
    if (!/^[a-f0-9]{64}$/.test(key)) throw new TypeError("Invalid thumbnail cache key");
    return new File(this.directory, `${key}.jpg`);
  }

  private async loadIndex(): Promise<ThumbnailIndex> {
    this.ensureDirectory();
    const file = new File(this.directory, INDEX_FILE_NAME);
    if (!file.exists) return emptyIndex();
    try {
      return parseIndex(JSON.parse(await file.text()));
    } catch (cause) {
      void cause;
      return emptyIndex();
    }
  }

  private getIndex(): Promise<ThumbnailIndex> {
    this.indexPromise ??= this.loadIndex();
    return this.indexPromise;
  }

  private async writeIndex(index: ThumbnailIndex): Promise<void> {
    const temporary = new File(this.directory, `${INDEX_FILE_NAME}.tmp`);
    if (temporary.exists) temporary.delete();
    temporary.create();
    temporary.write(JSON.stringify(index));
    await temporary.move(new File(this.directory, INDEX_FILE_NAME), { overwrite: true });
    this.indexPromise = Promise.resolve(index);
  }

  private mutate<T>(task: (index: ThumbnailIndex) => Promise<T>): Promise<T> {
    const result = this.mutationTail.then(async () => task(await this.getIndex()));
    this.mutationTail = result.then(() => undefined, () => undefined);
    return result;
  }

  async get(key: string): Promise<ThumbnailCacheEntry | null> {
    const file = this.thumbnailFile(key);
    if (!file.exists || file.size <= 0) return null;
    const index = await this.getIndex();
    return {
      key,
      uri: file.uri,
      byteSize: file.size,
      lastAccessedAt: index.entries[key]?.lastAccessedAt ?? file.lastModified ?? 0
    };
  }

  async list(): Promise<readonly ThumbnailCacheEntry[]> {
    this.ensureDirectory();
    const index = await this.getIndex();
    return this.directory.list().flatMap((entry): ThumbnailCacheEntry[] => {
      if (!(entry instanceof File) || !/^[a-f0-9]{64}\.jpg$/.test(entry.name) || entry.size <= 0) {
        return [];
      }
      const key = entry.name.slice(0, -4);
      return [{
        key,
        uri: entry.uri,
        byteSize: entry.size,
        lastAccessedAt: index.entries[key]?.lastAccessedAt ?? entry.lastModified ?? 0
      }];
    });
  }

  touch(key: string, timestamp: number): Promise<void> {
    return this.mutate(async (index) => {
      const existing = await this.get(key);
      if (existing === null) return;
      await this.writeIndex({
        version: 1,
        entries: { ...index.entries, [key]: { byteSize: existing.byteSize, lastAccessedAt: timestamp } }
      });
    });
  }

  remove(key: string): Promise<void> {
    return this.mutate(async (index) => {
      const file = this.thumbnailFile(key);
      if (file.exists) file.delete();
      const entries = { ...index.entries };
      delete entries[key];
      await this.writeIndex({ version: 1, entries });
    });
  }

  commit(key: string, renderedUri: string, byteSize: number, timestamp: number): Promise<string> {
    return this.mutate(async (index) => {
      const destination = this.thumbnailFile(key);
      await new File(renderedUri).move(destination, { overwrite: true });
      await this.writeIndex({
        version: 1,
        entries: { ...index.entries, [key]: { byteSize, lastAccessedAt: timestamp } }
      });
      return destination.uri;
    });
  }

  async discard(renderedUri: string): Promise<void> {
    const file = new File(renderedUri);
    if (file.exists) file.delete();
  }
}

const expoThumbnailRenderer: ThumbnailRenderer = {
  async render(assetId) {
    const { Asset } = await import("expo-media-library");
    const asset = new Asset(assetId);
    const [sourceUri, shape] = await Promise.all([asset.getUri(), asset.getShape()]);
    const context = ImageManipulator.manipulate(sourceUri);
    if (shape !== null && Math.max(shape.width, shape.height) > THUMBNAIL_LONG_EDGE) {
      context.resize(shape.width >= shape.height
        ? { width: THUMBNAIL_LONG_EDGE }
        : { height: THUMBNAIL_LONG_EDGE });
    }
    const image = await context.renderAsync();
    try {
      const result = await image.saveAsync({ compress: 0.72, format: SaveFormat.JPEG });
      const file = new File(result.uri);
      return { uri: result.uri, byteSize: file.size };
    } finally {
      image.release();
      context.release();
    }
  }
};

export const devicePhotoThumbnailCache = createThumbnailCache({
  keyForAsset: (assetId) => digestStringAsync(CryptoDigestAlgorithm.SHA256, assetId),
  renderer: expoThumbnailRenderer,
  storage: new ExpoThumbnailCacheStorage()
});
