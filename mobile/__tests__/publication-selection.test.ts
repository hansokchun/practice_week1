import {
  createPublicationReviewParams,
  parsePublicationReviewParams,
  togglePublicationPhoto
} from "../src/publication-selection";

describe("explicit publication photo selection", () => {
  it("adds and removes unique asset ids while preserving selection order", () => {
    expect(togglePublicationPhoto([], "asset-a")).toEqual(["asset-a"]);
    expect(togglePublicationPhoto(["asset-a", "asset-b"], "asset-a")).toEqual(["asset-b"]);
    expect(togglePublicationPhoto(["asset-a"], "asset-b")).toEqual(["asset-a", "asset-b"]);
  });

  it("round-trips a bounded review selection for every explicit intent", () => {
    for (const intent of ["private", "link", "public"] as const) {
      const params = createPublicationReviewParams(intent, ["asset-a", "asset-b"]);
      expect(parsePublicationReviewParams(params)).toEqual({
        intent,
        assetIds: ["asset-a", "asset-b"]
      });
    }
  });

  it("rejects empty, malformed, duplicated, or oversized review selections", () => {
    expect(parsePublicationReviewParams({ intent: "public", assetIds: "[]" })).toBeNull();
    expect(parsePublicationReviewParams({ intent: "unknown", assetIds: '["asset-a"]' })).toBeNull();
    expect(parsePublicationReviewParams({ intent: "link", assetIds: '["asset-a","asset-a"]' })).toBeNull();
    expect(() => togglePublicationPhoto(Array.from({ length: 20 }, (_, index) => `asset-${index}`), "overflow"))
      .toThrow("Up to 20 photos can be selected");
  });
});
