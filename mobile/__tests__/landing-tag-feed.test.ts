import {
  buildLandingTagFeed,
  filterLandingTagPhotosByRegion,
  getLandingPhotoRegion,
  getLandingTagRegions
} from "../src/landing-tag-feed";
import type { LandingPhoto, LandingSection } from "../src/landing-photo-repository";

function photo(id: string, fields: Partial<LandingPhoto> = {}): LandingPhoto {
  return {
    id,
    title: null,
    description: null,
    album: null,
    ownerId: "owner",
    createdAt: "2026-08-30T00:00:00.000Z",
    date: null,
    imageUrl: `https://example.com/${id}.jpg`,
    locationPrecision: "approximate",
    lat: null,
    lng: null,
    aiTags: [],
    aiScene: null,
    aiSummary: null,
    ...fields
  };
}

describe("mobile landing tag feed", () => {
  it("keeps at most twenty curated photos first and stably shuffles matching photos", () => {
    const photos = Array.from({ length: 28 }, (_, index) => photo(`p${index + 1}`, { aiTags: ["한국"] }));
    const curatedPhotoIds = Array.from({ length: 23 }, (_, index) => `p${index + 1}`);
    const section: LandingSection = {
      id: "korea",
      title: "한국",
      description: "",
      curatedPhotoIds,
      photos
    };

    const first = buildLandingTagFeed(section, "session-a");
    const repeated = buildLandingTagFeed(section, "session-a");
    const anotherSession = buildLandingTagFeed(section, "session-b");

    expect(first.slice(0, 20).map((item) => item.id)).toEqual(curatedPhotoIds.slice(0, 20));
    expect(first).toHaveLength(28);
    expect(new Set(first.map((item) => item.id)).size).toBe(28);
    expect(repeated.map((item) => item.id)).toEqual(first.map((item) => item.id));
    expect(anotherSession.slice(20).map((item) => item.id)).not.toEqual(first.slice(20).map((item) => item.id));
  });

  it("derives conservative region chips from AI and photo copy", () => {
    const photos = [
      photo("seoul", { aiTags: ["서울", "야경"] }),
      photo("jeju", { description: "제주 바다" }),
      photo("japan", { album: "일본 골목" }),
      photo("unknown", { aiTags: ["도로"] })
    ];

    expect(getLandingPhotoRegion(photos[0]!)).toBe("서울");
    expect(getLandingPhotoRegion(photos[1]!)).toBe("제주");
    expect(getLandingPhotoRegion(photos[2]!)).toBe("일본");
    expect(getLandingPhotoRegion(photos[3]!)).toBe("");
    expect(getLandingTagRegions(photos)).toEqual([
      { label: "서울", count: 1 },
      { label: "일본", count: 1 },
      { label: "제주", count: 1 }
    ]);
    expect(filterLandingTagPhotosByRegion(photos, "제주").map((item) => item.id)).toEqual(["jeju"]);
  });
});
