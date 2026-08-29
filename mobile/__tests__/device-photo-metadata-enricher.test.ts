import { enrichPendingDevicePhotoMetadata } from "../src/device-photo-metadata-enricher";

describe("device photo metadata enrichment", () => {
  it("enriches only the bounded pending asset batch", async () => {
    const getPendingAssetIds = jest.fn(async () => ["asset-a", "asset-b"]);
    const saveMetadata = jest.fn(async () => undefined);
    const read = jest.fn(async () => ({
      mediaType: "photo" as const,
      capturedAt: null,
      latitude: null,
      longitude: null,
      exifJson: "{}"
    }));

    await expect(enrichPendingDevicePhotoMetadata(
      { getPendingAssetIds, saveMetadata },
      { read }
    )).resolves.toEqual({ processedAssetCount: 2 });

    expect(getPendingAssetIds).toHaveBeenCalledWith(60);
    expect(read).toHaveBeenNthCalledWith(1, "asset-a");
    expect(read).toHaveBeenNthCalledWith(2, "asset-b");
    expect(saveMetadata).toHaveBeenCalledTimes(2);
  });
});
