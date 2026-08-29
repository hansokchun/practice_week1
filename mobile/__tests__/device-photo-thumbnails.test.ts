import { hydrateDevicePhotoThumbnails } from "../src/device-photo-thumbnails";

const photos = ["a", "b", "c", "d"].map((id) => ({
  id,
  filename: `${id}.jpg`,
  width: 100,
  height: 100,
  creationTime: 1
}));

describe("device photo thumbnail hydration", () => {
  it("preserves order, bounds concurrency, and falls back per failed asset", async () => {
    let active = 0;
    let maximumActive = 0;
    const loadThumbnail = jest.fn(async (assetId: string) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      if (assetId === "c") throw new Error("unavailable original");
      return `file:///cache/${assetId}.jpg`;
    });

    const result = await hydrateDevicePhotoThumbnails(photos, loadThumbnail, 2);

    expect(maximumActive).toBeLessThanOrEqual(2);
    expect(result.map((photo) => photo.id)).toEqual(["a", "b", "c", "d"]);
    expect(result[0]?.thumbnailUri).toBe("file:///cache/a.jpg");
    expect(result[2]?.thumbnailUri).toBeUndefined();
  });
});
