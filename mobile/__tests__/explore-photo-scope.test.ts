import { getExplorePhotoScopeOptions, normalizeExplorePhotoScope } from "../src/explore-photo-scope";

describe("Explore public photo scope", () => {
  it("keeps guests on the public others scope", () => {
    expect(normalizeExplorePhotoScope("mine", null)).toBe("others");
    expect(getExplorePhotoScopeOptions(null)).toEqual([
      { id: "others", label: "공개 사진" }
    ]);
  });

  it("lets a signed-in user switch between all owned located photos and other public photos", () => {
    expect(normalizeExplorePhotoScope("mine", "owner-a")).toBe("mine");
    expect(normalizeExplorePhotoScope("unexpected", "owner-a")).toBe("others");
    expect(getExplorePhotoScopeOptions("owner-a")).toEqual([
      { id: "others", label: "다른 사람 사진" },
      { id: "mine", label: "내 사진" }
    ]);
  });
});
