import {
  calculatePublicationDerivativeSize,
  preparePublicationDerivatives,
  PUBLICATION_DERIVATIVE_QUALITY
} from "../src/publication-derivative";

describe("temporary publication derivatives", () => {
  it("bounds the long edge without enlarging a smaller original", () => {
    expect(calculatePublicationDerivativeSize({ width: 4000, height: 3000 })).toEqual({
      width: 2048,
      height: 1536
    });
    expect(calculatePublicationDerivativeSize({ width: 3000, height: 4000 })).toEqual({
      width: 1536,
      height: 2048
    });
    expect(calculatePublicationDerivativeSize({ width: 1200, height: 900 })).toEqual({
      width: 1200,
      height: 900
    });
  });

  it("creates JPEG derivatives from explicitly selected originals without uploading", async () => {
    const create = jest.fn(async (assetId: string, options: object) => ({
      assetId,
      uri: `file:///cache/ikkyee-derivatives/${assetId}.jpg`,
      width: 2048,
      height: 1536,
      byteSize: 400_000,
      format: "jpeg" as const,
      metadataPolicy: "stripped" as const,
      createdAt: 1_000,
      expiresAt: 3_601_000
    }));
    const remove = jest.fn(async () => undefined);

    await expect(preparePublicationDerivatives(["asset-a", "asset-b"], {
      factory: { create, remove },
      now: () => 1_000
    })).resolves.toHaveLength(2);
    expect(create).toHaveBeenNthCalledWith(1, "asset-a", {
      format: "jpeg",
      maximumLongEdge: 2048,
      quality: PUBLICATION_DERIVATIVE_QUALITY,
      createdAt: 1_000,
      expiresAt: 3_601_000
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it("removes every derivative from a partially failed preparation", async () => {
    const remove = jest.fn(async () => undefined);
    const factory = {
      create: jest.fn(async (assetId: string) => {
        if (assetId === "asset-b") throw new Error("decode failed");
        return {
          assetId,
          uri: `file:///cache/ikkyee-derivatives/${assetId}.jpg`,
          width: 1200,
          height: 900,
          byteSize: 200_000,
          format: "jpeg" as const,
          metadataPolicy: "stripped" as const,
          createdAt: 1_000,
          expiresAt: 3_601_000
        };
      }),
      remove
    };

    await expect(preparePublicationDerivatives(["asset-a", "asset-b"], {
      factory,
      now: () => 1_000
    })).rejects.toThrow("게시용 사진을 준비하지 못했습니다");
    expect(remove).toHaveBeenCalledWith("file:///cache/ikkyee-derivatives/asset-a.jpg");
  });

  it("rejects invalid or duplicated selections before reading originals", async () => {
    const factory = { create: jest.fn(), remove: jest.fn() };
    await expect(preparePublicationDerivatives([], { factory })).rejects.toThrow("게시용 사진을 준비하지 못했습니다");
    await expect(preparePublicationDerivatives(["same", "same"], { factory })).rejects.toThrow("게시용 사진을 준비하지 못했습니다");
    expect(factory.create).not.toHaveBeenCalled();
  });
});
