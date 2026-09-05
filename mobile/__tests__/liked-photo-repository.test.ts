import { fetchLikedPhotos, setPhotoLiked } from "../src/liked-photo-repository";

describe("liked photo repository", () => {
  it("loads only still-public photos referenced by the current user's like rows", async () => {
    const fetchLikedIds = jest.fn(async () => ({ ids: ["photo-a", "photo-private"], error: null }));
    const fetchPublicPhotos = jest.fn(async () => ({ rows: [{
      id: "photo-a", date: "2026-08-24", description: "한강 저녁",
      storage_path: "owner-a/photo-a.jpg", thumbnail_path: "owner-a/thumbnails/photo-a.jpg", created_at: "2026-08-24T10:00:00.000Z"
    }], error: null }));
    const signPaths = jest.fn(async () => ({
      urls: new Map([["owner-a/thumbnails/photo-a.jpg", "https://example.supabase.co/signed/photo-a-thumbnail"]]), error: null
    }));

    await expect(fetchLikedPhotos(undefined, { fetchLikedIds, fetchPublicPhotos, signPaths })).resolves.toEqual([{
      id: "photo-a", date: "2026-08-24", description: "한강 저녁",
      imageUrl: "https://example.supabase.co/signed/photo-a-thumbnail", createdAt: "2026-08-24T10:00:00.000Z"
    }]);
    expect(fetchPublicPhotos).toHaveBeenCalledWith(["photo-a", "photo-private"], undefined);
    expect(signPaths).toHaveBeenCalledWith(["owner-a/thumbnails/photo-a.jpg"], 300, undefined);
  });

  it("uses the atomic RPC and accepts only a non-negative count", async () => {
    const invoke = jest.fn(async () => ({ data: 8, error: null }));

    await expect(setPhotoLiked("photo-a", true, invoke)).resolves.toBe(8);
    expect(invoke).toHaveBeenCalledWith("set_photo_like", { target_photo_id: "photo-a", should_like: true });
    await expect(setPhotoLiked("photo-a", false, async () => ({ data: -1, error: null }))).rejects.toThrow("좋아요");
  });
});
