import { createThumbnailCache, MAXIMUM_THUMBNAIL_CACHE_BYTES } from "../src/thumbnail-cache";

describe("bounded thumbnail cache", () => {
  it("returns and touches an existing thumbnail without rendering the original", async () => {
    const touch = jest.fn(async () => undefined);
    const render = jest.fn();
    const cache = createThumbnailCache({
      keyForAsset: async () => "asset-key",
      now: () => 200,
      renderer: { render },
      storage: {
        get: async () => ({ key: "asset-key", uri: "file:///cache/current.jpg", byteSize: 20, lastAccessedAt: 100 }),
        list: async () => [],
        touch,
        remove: async () => undefined,
        commit: async () => { throw new Error("not used"); },
        discard: async () => undefined
      }
    });

    await expect(cache.getOrCreate("asset-1")).resolves.toBe("file:///cache/current.jpg");
    expect(touch).toHaveBeenCalledWith("asset-key", 200);
    expect(render).not.toHaveBeenCalled();
  });

  it("evicts least-recently-used files before committing a new thumbnail", async () => {
    const removed: string[] = [];
    const commit = jest.fn(async () => "file:///cache/new.jpg");
    const cache = createThumbnailCache({
      keyForAsset: async () => "new-key",
      maximumBytes: 100,
      now: () => 300,
      renderer: { render: async () => ({ uri: "file:///tmp/rendered.jpg", byteSize: 40 }) },
      storage: {
        get: async () => null,
        list: async () => [
          { key: "oldest", uri: "file:///cache/oldest.jpg", byteSize: 30, lastAccessedAt: 10 },
          { key: "recent", uri: "file:///cache/recent.jpg", byteSize: 50, lastAccessedAt: 20 }
        ],
        touch: async () => undefined,
        remove: async (key) => { removed.push(key); },
        commit,
        discard: async () => undefined
      }
    });

    await expect(cache.getOrCreate("asset-new")).resolves.toBe("file:///cache/new.jpg");
    expect(removed).toEqual(["oldest"]);
    expect(commit).toHaveBeenCalledWith("new-key", "file:///tmp/rendered.jpg", 40, 300);
  });

  it("discards a rendered file that can never fit the 512 MiB policy", async () => {
    const discard = jest.fn(async () => undefined);
    const cache = createThumbnailCache({
      keyForAsset: async () => "huge-key",
      renderer: {
        render: async () => ({
          uri: "file:///tmp/huge.jpg",
          byteSize: MAXIMUM_THUMBNAIL_CACHE_BYTES + 1
        })
      },
      storage: {
        get: async () => null,
        list: async () => [],
        touch: async () => undefined,
        remove: async () => undefined,
        commit: async () => "",
        discard
      }
    });

    await expect(cache.getOrCreate("asset-huge")).rejects.toThrow(
      "Rendered thumbnail exceeds the cache capacity"
    );
    expect(discard).toHaveBeenCalledWith("file:///tmp/huge.jpg");
  });

  it("supports photo deletion and account-level cache clearing", async () => {
    const remove = jest.fn(async (_key: string) => undefined);
    const cache = createThumbnailCache({
      keyForAsset: async (assetId) => `${assetId}-key`,
      renderer: { render: async () => ({ uri: "", byteSize: 1 }) },
      storage: {
        get: async () => null,
        list: async () => [
          { key: "a-key", uri: "file:///cache/a.jpg", byteSize: 10, lastAccessedAt: 1 },
          { key: "b-key", uri: "file:///cache/b.jpg", byteSize: 10, lastAccessedAt: 2 }
        ],
        touch: async () => undefined,
        remove,
        commit: async () => "",
        discard: async () => undefined
      }
    });

    await cache.remove("selected");
    await cache.clear();

    expect(remove.mock.calls.map(([key]) => key)).toEqual(["selected-key", "a-key", "b-key"]);
  });
});
