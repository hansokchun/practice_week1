import { fetchLandingContent, filterLandingPhotos } from "../src/landing-photo-repository";

const rows = [{
  id: "photo-a", description: "제주 바다", title: null, album: "한국 여행",
  storage_path: "owner-a/photo-a.jpg", owner_id: "owner-a", created_at: "2026-08-27T00:00:00.000Z",
  thumbnail_path: "owner-a/thumbnails/photo-a.jpg",
  date: "2026-08-20", location_precision: "approximate", lat: 33.4, lng: 126.5
}];

describe("landing photo repository", () => {
  it("loads visible curation and public photos from the shared web tables", async () => {
    const fetchCuration = jest.fn(async () => ({
      sections: [{ id: "section-a", title: "추천", description: "", sort_order: 0, is_visible: true }],
      assignments: [{ section_id: "section-a", photo_id: "photo-a", sort_order: 0 }],
      error: null
    }));
    const fetchPhotos = jest.fn(async () => ({ rows, error: null }));
    const signPaths = jest.fn(async () => ({
      urls: new Map([["owner-a/thumbnails/photo-a.jpg", "https://example.supabase.co/signed/photo-a-thumbnail"]]), error: null
    }));

    await expect(fetchLandingContent({ fetchCuration, fetchPhotos, signPaths })).resolves.toEqual({
      sections: [{
        id: "section-a", title: "추천", description: "",
        photos: [expect.objectContaining({ id: "photo-a", imageUrl: "https://example.supabase.co/signed/photo-a-thumbnail" })],
        curatedPhotoIds: ["photo-a"]
      }]
    });
    expect(fetchPhotos).toHaveBeenCalledWith(200);
    expect(signPaths).toHaveBeenCalledWith(["owner-a/thumbnails/photo-a.jpg"], 300);
  });

  it("searches only safe public photo copy and hides provider errors", async () => {
    const photos = [{
      id: "photo-a", description: "제주 바다", title: null, album: "한국 여행", ownerId: "owner-a",
      createdAt: "2026-08-27T00:00:00.000Z", date: null, imageUrl: "https://example.com/a.jpg",
      locationPrecision: "approximate" as const, lat: null, lng: null
    }];
    expect(filterLandingPhotos(photos, "제주")).toEqual(photos);
    expect(filterLandingPhotos(photos, "도쿄")).toEqual([]);

    await expect(fetchLandingContent({
      fetchCuration: async () => ({ sections: [], assignments: [], error: new Error("private detail") }),
      fetchPhotos: jest.fn(), signPaths: jest.fn()
    })).rejects.toThrow("랜딩 사진을 불러오지 못했어요.");
  });

  it("ranks exact copy before synonym tags and AI scene matches", () => {
    const base = {
      title: null, album: null, ownerId: "owner", createdAt: "2026-08-30T00:00:00.000Z",
      date: null, imageUrl: "https://example.com/photo.jpg", locationPrecision: "approximate" as const,
      lat: null, lng: null, aiSummary: null, aiMoods: [] as const
    };
    const photos = [
      { ...base, id: "scene", description: null, aiTags: [] as const, aiScene: "road" },
      { ...base, id: "synonym", description: null, aiTags: ["도로"] as const, aiScene: null },
      { ...base, id: "exact", description: "서울 길", aiTags: [] as const, aiScene: null }
    ];

    expect(filterLandingPhotos(photos, "길").map((photo) => photo.id)).toEqual(["exact", "synonym", "scene"]);
    expect(filterLandingPhotos(photos, "도로").map((photo) => photo.id)).toEqual(["synonym", "scene", "exact"]);
  });
});
