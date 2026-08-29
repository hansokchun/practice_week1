import { fetchPublicPhotoDetail } from "../src/public-photo-detail-repository";

describe("public photo detail repository", () => {
  it("loads one public row, its public profile, and a short-lived signed image", async () => {
    const signal = new AbortController().signal;
    const fetchPhoto = jest.fn(async () => ({ row: {
      id: "photo-a", date: "2026-08-24", description: "한강 저녁", liked: 7,
      owner_id: "11111111-1111-4111-8111-111111111111", created_at: "2026-08-24T10:00:00.000Z",
      storage_path: "11111111-1111-4111-8111-111111111111/photo-a.jpg", location_precision: "approximate",
      lat: 37.52, lng: 126.97, visibility: "public"
    }, error: null }));
    const fetchProfile = jest.fn(async () => ({ row: { nickname: "여행자", avatar_url: "" }, error: null }));
    const signPath = jest.fn(async () => ({ url: "https://example.supabase.co/signed/photo-a", error: null }));
    const fetchViewerLike = jest.fn(async () => ({ liked: true, error: null }));

    await expect(fetchPublicPhotoDetail("photo-a", signal, { fetchPhoto, fetchProfile, fetchViewerLike, signPath })).resolves.toEqual({
      id: "photo-a", date: "2026-08-24", description: "한강 저녁", liked: 7,
      owner: { id: "11111111-1111-4111-8111-111111111111", displayName: "여행자", avatarUrl: null },
      createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a",
      locationPrecision: "approximate",
      location: { lat: 37.52, lng: 126.97 },
      visibility: "public",
      viewerHasLiked: true
    });
    expect(fetchPhoto).toHaveBeenCalledWith("photo-a", signal);
    expect(fetchProfile).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", signal);
    expect(signPath).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111/photo-a.jpg", 300, signal);
    expect(fetchViewerLike).toHaveBeenCalledWith("photo-a", signal);
  });

  it("loads a private location only for the authenticated photo owner", async () => {
    const ownerId = "11111111-1111-4111-8111-111111111111";
    const dependencies = {
      fetchPhoto: async () => ({ row: {
        id: "photo-private", date: null, description: "나만 보는 사진", liked: 0,
        owner_id: ownerId, created_at: "2026-08-24T10:00:00.000Z",
        storage_path: `${ownerId}/photo-private.jpg`, location_precision: "hidden",
        lat: null, lng: null, visibility: "private"
      }, error: null }),
      fetchProfile: async () => ({ row: { nickname: "나", avatar_url: "" }, error: null }),
      fetchViewerLike: async () => ({ liked: false, error: null }),
      fetchPrivateLocation: jest.fn(async () => ({ row: { lat: 37.52, lng: 126.97 }, error: null })),
      signPath: async () => ({ url: "https://example.supabase.co/signed/photo-private", error: null })
    };

    await expect(fetchPublicPhotoDetail("photo-private", undefined, dependencies, ownerId)).resolves.toEqual(
      expect.objectContaining({
        id: "photo-private", visibility: "private", locationPrecision: "hidden",
        location: { lat: 37.52, lng: 126.97 }
      })
    );
    await expect(fetchPublicPhotoDetail("photo-private", undefined, dependencies, "another-user")).rejects.toThrow("공개 사진");
  });

  it("rejects unsafe IDs and maps missing, private, or malformed data to one failure", async () => {
    const dependencies = { fetchPhoto: jest.fn(), fetchProfile: jest.fn(), fetchViewerLike: jest.fn(), signPath: jest.fn() };
    await expect(fetchPublicPhotoDetail("../private", undefined, dependencies)).rejects.toThrow("공개 사진");
    expect(dependencies.fetchPhoto).not.toHaveBeenCalled();

    await expect(fetchPublicPhotoDetail("photo-a", undefined, {
      fetchPhoto: async () => ({ row: null, error: new Error("private policy detail") }),
      fetchProfile: jest.fn(), fetchViewerLike: jest.fn(),
      signPath: jest.fn()
    })).rejects.toThrow("공개 사진");
  });
});
