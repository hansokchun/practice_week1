import { pruneTombstonedDevicePhotoThumbnails } from "../src/device-photo-thumbnail-cleanup";

describe("device photo thumbnail cleanup", () => {
  it("removes cached derivatives for missing OS originals", async () => {
    const getAllAsync = async <T,>(_source: string): Promise<T[]> => ([
      { asset_id: "asset-a" },
      { asset_id: "asset-b" }
    ] as unknown as T[]);
    const remove = jest.fn(async (_assetId: string) => undefined);

    await expect(pruneTombstonedDevicePhotoThumbnails(
      { getAllAsync },
      { remove }
    )).resolves.toEqual({ removedThumbnailCount: 2 });

    expect(remove.mock.calls.map(([assetId]) => assetId)).toEqual(["asset-a", "asset-b"]);
  });
});
