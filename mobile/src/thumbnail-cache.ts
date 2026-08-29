export const MAXIMUM_THUMBNAIL_CACHE_BYTES = 512 * 1024 * 1024;

export type ThumbnailCacheEntry = {
  readonly key: string;
  readonly uri: string;
  readonly byteSize: number;
  readonly lastAccessedAt: number;
};

export type RenderedThumbnail = {
  readonly uri: string;
  readonly byteSize: number;
};

export type ThumbnailCacheStorage = {
  readonly get: (key: string) => Promise<ThumbnailCacheEntry | null>;
  readonly list: () => Promise<readonly ThumbnailCacheEntry[]>;
  readonly touch: (key: string, timestamp: number) => Promise<void>;
  readonly remove: (key: string) => Promise<void>;
  readonly commit: (
    key: string,
    renderedUri: string,
    byteSize: number,
    timestamp: number
  ) => Promise<string>;
  readonly discard: (renderedUri: string) => Promise<void>;
};

export type ThumbnailRenderer = {
  readonly render: (assetId: string) => Promise<RenderedThumbnail>;
};

type ThumbnailCacheDependencies = {
  readonly keyForAsset: (assetId: string) => Promise<string>;
  readonly renderer: ThumbnailRenderer;
  readonly storage: ThumbnailCacheStorage;
  readonly maximumBytes?: number;
  readonly now?: () => number;
};

export type ThumbnailCache = {
  readonly getOrCreate: (assetId: string) => Promise<string>;
  readonly remove: (assetId: string) => Promise<void>;
  readonly clear: () => Promise<void>;
};

export class ThumbnailCacheCapacityError extends Error {
  public constructor() {
    super("Rendered thumbnail exceeds the cache capacity");
    this.name = "ThumbnailCacheCapacityError";
  }
}

export function selectThumbnailEvictions(
  entries: readonly ThumbnailCacheEntry[],
  incomingBytes: number,
  maximumBytes: number
): readonly ThumbnailCacheEntry[] {
  const totalBytes = entries.reduce((sum, entry) => sum + Math.max(0, entry.byteSize), 0);
  let bytesToFree = Math.max(0, totalBytes + incomingBytes - maximumBytes);
  const evictions: ThumbnailCacheEntry[] = [];
  for (const entry of [...entries].sort((left, right) =>
    left.lastAccessedAt - right.lastAccessedAt || left.key.localeCompare(right.key)
  )) {
    if (bytesToFree <= 0) break;
    evictions.push(entry);
    bytesToFree -= Math.max(0, entry.byteSize);
  }
  return evictions;
}

export function createThumbnailCache({
  keyForAsset,
  renderer,
  storage,
  maximumBytes = MAXIMUM_THUMBNAIL_CACHE_BYTES,
  now = Date.now
}: ThumbnailCacheDependencies): ThumbnailCache {
  const inFlight = new Map<string, Promise<string>>();
  let mutationTail: Promise<void> = Promise.resolve();

  function withMutation<T>(task: () => Promise<T>): Promise<T> {
    const result = mutationTail.then(task, task);
    mutationTail = result.then(() => undefined, () => undefined);
    return result;
  }

  return {
    async getOrCreate(assetId) {
      const key = await keyForAsset(assetId);
      const active = inFlight.get(key);
      if (active !== undefined) return active;

      const operation = (async () => {
        const timestamp = now();
        const existing = await storage.get(key);
        if (existing !== null) {
          await storage.touch(key, timestamp);
          return existing.uri;
        }

        const rendered = await renderer.render(assetId);
        if (
          !Number.isFinite(rendered.byteSize) || rendered.byteSize <= 0 ||
          rendered.byteSize > maximumBytes
        ) {
          await storage.discard(rendered.uri);
          throw new ThumbnailCacheCapacityError();
        }

        try {
          return await withMutation(async () => {
            const concurrentEntry = await storage.get(key);
            if (concurrentEntry !== null) {
              await storage.discard(rendered.uri);
              await storage.touch(key, timestamp);
              return concurrentEntry.uri;
            }
            const entries = await storage.list();
            for (const entry of selectThumbnailEvictions(entries, rendered.byteSize, maximumBytes)) {
              await storage.remove(entry.key);
            }
            return storage.commit(key, rendered.uri, rendered.byteSize, timestamp);
          });
        } catch (cause) {
          await storage.discard(rendered.uri).catch(() => undefined);
          throw cause;
        }
      })();
      inFlight.set(key, operation);
      try {
        return await operation;
      } finally {
        inFlight.delete(key);
      }
    },
    async remove(assetId) {
      const key = await keyForAsset(assetId);
      await withMutation(() => storage.remove(key));
    },
    async clear() {
      await withMutation(async () => {
        for (const entry of await storage.list()) await storage.remove(entry.key);
      });
    }
  };
}
