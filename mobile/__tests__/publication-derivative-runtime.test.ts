import { createPublicationDerivativeRuntime } from "../src/publication-derivative-runtime";

describe("publication derivative runtime", () => {
  it("clears expired cache files before creating a new batch", async () => {
    const clearExpired = jest.fn(async () => 2);
    const clearAll = jest.fn(async () => 3);
    const create = jest.fn(async (assetId: string) => ({
      assetId,
      uri: `file:///cache/ikkyee-derivatives/${assetId}.jpg`,
      width: 1600,
      height: 1200,
      byteSize: 300_000,
      format: "jpeg" as const,
      metadataPolicy: "stripped" as const,
      createdAt: 10_000,
      expiresAt: 3_610_000
    }));
    const runtime = createPublicationDerivativeRuntime({
      cache: { clearAll, clearExpired },
      factory: { create, remove: jest.fn(async () => undefined) },
      now: () => 10_000
    });

    const result = await runtime.prepare(["asset-a"]);

    expect(clearExpired).toHaveBeenCalledWith(10_000);
    expect(create).toHaveBeenCalledTimes(1);
    expect(result[0]?.expiresAt).toBe(3_610_000);
    await expect(runtime.clear()).resolves.toBe(3);
    expect(clearAll).toHaveBeenCalledTimes(1);
  });
});
