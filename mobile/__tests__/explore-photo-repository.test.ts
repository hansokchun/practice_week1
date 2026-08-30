import { fetchExplorePhotoPage, fetchOwnedPhotoBounds, fetchPublicPhotoBounds, SEOUL_EXPLORE_BOUNDS } from "../src/explore-photo-repository";

describe("explore photo repository", () => {
  it("requests only public photos inside the viewport with bounded pagination", async () => {
    const signal = new AbortController().signal;
    const fetchRows = jest.fn(async () => ({ rows: [{
      id: "photo-a", date: "2026-08-24", description: "한강 저녁", liked: 3,
      owner_id: "owner-a", created_at: "2026-08-24T10:00:00.000Z",
      storage_path: "owner-a/photo-a.jpg", lat: 37.52, lng: 126.97,
      location_precision: "approximate"
    }], error: null }));
    const signPaths = jest.fn(async () => ({
      urls: new Map([["owner-a/photo-a.jpg", "https://example.supabase.co/signed/photo-a"]]),
      error: null
    }));

    const page = await fetchExplorePhotoPage({
      bounds: SEOUL_EXPLORE_BOUNDS, offset: 20, pageSize: 20, signal,
      scope: "others", viewerId: "owner-viewer"
    }, { fetchRows, signPaths });

    expect(fetchRows).toHaveBeenCalledWith(expect.objectContaining({
      bounds: SEOUL_EXPLORE_BOUNDS, offset: 20, limit: 20, signal,
      scope: "others", viewerId: "owner-viewer"
    }));
    expect(signPaths).toHaveBeenCalledWith(["owner-a/photo-a.jpg"], 300, signal);
    expect(page).toEqual({
      photos: [expect.objectContaining({ id: "photo-a", imageUrl: "https://example.supabase.co/signed/photo-a" })],
      hasMore: false,
      nextOffset: 21
    });
  });

  it("fails safely when the query, signed URL, or row projection is unsafe", async () => {
    const base = { bounds: SEOUL_EXPLORE_BOUNDS, offset: 0, pageSize: 20 };
    await expect(fetchExplorePhotoPage(base, {
      fetchRows: async () => ({ rows: null, error: new Error("private query detail") }),
      signPaths: jest.fn()
    })).rejects.toThrow("공개 사진");
    await expect(fetchExplorePhotoPage(base, {
      fetchRows: async () => ({ rows: [{ id: "bad", storage_path: "../escape.jpg" }], error: null }),
      signPaths: jest.fn()
    })).rejects.toThrow("공개 사진");
  });

  it("never turns a hidden location into a public map pin even if legacy coordinates remain", async () => {
    const signPaths = jest.fn(async () => ({
      urls: new Map([["owner-a/photo-hidden.jpg", "https://example.supabase.co/signed/photo-hidden"]]),
      error: null
    }));

    await expect(fetchExplorePhotoPage({ bounds: SEOUL_EXPLORE_BOUNDS, offset: 0, pageSize: 20 }, {
      fetchRows: async () => ({ rows: [{
        id: "photo-hidden", date: "2026-08-24", description: null, liked: 0,
        owner_id: "owner-a", created_at: "2026-08-24T10:00:00.000Z",
        storage_path: "owner-a/photo-hidden.jpg", lat: 37.52, lng: 126.97,
        location_precision: "hidden"
      }], error: null }),
      signPaths
    })).rejects.toThrow("공개 사진");
  });

  it("allows an owner-only private source location in the mine scope", async () => {
    const signPaths = jest.fn(async () => ({
      urls: new Map([["owner-a/photo-private.jpg", "https://example.supabase.co/signed/photo-private"]]),
      error: null
    }));

    await expect(fetchExplorePhotoPage({
      bounds: SEOUL_EXPLORE_BOUNDS, offset: 0, pageSize: 20, scope: "mine", viewerId: "owner-a"
    }, {
      fetchRows: async () => ({ rows: [{
        id: "photo-private", date: null, description: "나만 보는 사진", liked: 0,
        owner_id: "owner-a", created_at: "2026-08-24T10:00:00.000Z",
        storage_path: "owner-a/photo-private.jpg", lat: 37.52, lng: 126.97,
        location_precision: "hidden", visibility: "private"
      }], error: null }),
      signPaths
    })).resolves.toEqual({
      photos: [expect.objectContaining({ id: "photo-private", visibility: "private", locationPrecision: "hidden" })],
      hasMore: false,
      nextOffset: 1
    });
  });

  it("returns an empty page without asking Storage to sign an empty path list", async () => {
    const signPaths = jest.fn();

    await expect(fetchExplorePhotoPage({ bounds: SEOUL_EXPLORE_BOUNDS, offset: 0, pageSize: 20 }, {
      fetchRows: async () => ({ rows: [], error: null }),
      signPaths
    })).resolves.toEqual({ photos: [], hasMore: false, nextOffset: 0 });
    expect(signPaths).not.toHaveBeenCalled();
  });

  it("rejects an own-photo scope without an authenticated viewer", async () => {
    await expect(fetchExplorePhotoPage({
      bounds: SEOUL_EXPLORE_BOUNDS, offset: 0, pageSize: 20, scope: "mine", viewerId: null
    }, {
      fetchRows: jest.fn(),
      signPaths: jest.fn()
    })).rejects.toThrow("공개 사진");
  });

  it("fits the initial owner viewport around every private source location", async () => {
    const bounds = await fetchOwnedPhotoBounds("owner-a", undefined, {
      fetchLocations: async () => ({ rows: [
        { lat: 33.45, lng: 126.55 },
        { lat: 37.57, lng: 126.98 },
        { lat: 35.18, lng: 129.08 }
      ], error: null })
    });

    expect(bounds).not.toBeNull();
    expect(bounds?.south).toBeLessThan(33.45);
    expect(bounds?.north).toBeGreaterThan(37.57);
    expect(bounds?.west).toBeLessThan(126.55);
    expect(bounds?.east).toBeGreaterThan(129.08);
  });

  it("fits the initial public viewport around every visible public location", async () => {
    const bounds = await fetchPublicPhotoBounds(undefined, {
      fetchLocations: async () => ({ rows: [
        { lat: 33.45, lng: 126.55 },
        { lat: 35.68, lng: 139.76 }
      ], error: null })
    });

    expect(bounds).not.toBeNull();
    expect(bounds?.south).toBeLessThan(33.45);
    expect(bounds?.north).toBeGreaterThan(35.68);
    expect(bounds?.west).toBeLessThan(126.55);
    expect(bounds?.east).toBeGreaterThan(139.76);
  });
});
