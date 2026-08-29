import { fetchPublicProfile } from "../src/public-profile-repository";

describe("public profile repository", () => {
  it("loads a public profile and only that author's public photos", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const fetchProfile = jest.fn(async () => ({ row: { nickname: "여행자", bio: "천천히 걷습니다", avatar_url: "" }, error: null }));
    const fetchPhotos = jest.fn(async () => ({ rows: [{
      id: "photo-a", description: "한강 저녁", storage_path: `${userId}/photo-a.jpg`
    }], error: null }));
    const signPaths = jest.fn(async () => ({
      urls: new Map([[`${userId}/photo-a.jpg`, "https://example.supabase.co/signed/photo-a"]]), error: null
    }));

    await expect(fetchPublicProfile(userId, undefined, { fetchProfile, fetchPhotos, signPaths })).resolves.toEqual({
      displayName: "여행자", bio: "천천히 걷습니다", avatarUrl: null,
      photos: [{ id: "photo-a", description: "한강 저녁", imageUrl: "https://example.supabase.co/signed/photo-a" }]
    });
    expect(fetchProfile).toHaveBeenCalledWith(userId, undefined);
    expect(fetchPhotos).toHaveBeenCalledWith(userId, 12, undefined);
    expect(signPaths).toHaveBeenCalledWith([`${userId}/photo-a.jpg`], 300, undefined);
  });

  it("prefers a managed avatar path over a legacy provider URL", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const avatarPath = `${userId}/avatar-22222222-2222-4222-8222-222222222222.jpg`;
    const dependencies = {
      fetchProfile: jest.fn(async () => ({ row: { nickname: "여행자", bio: "", avatar_url: "https://legacy.example/avatar.jpg", avatar_path: avatarPath }, error: null })),
      fetchPhotos: jest.fn(async () => ({ rows: [], error: null })),
      signPaths: jest.fn(),
      publicAvatarUrl: jest.fn((path: string) => `https://storage.example/${path}`)
    };

    await expect(fetchPublicProfile(userId, undefined, dependencies)).resolves.toMatchObject({
      avatarUrl: `https://storage.example/${avatarPath}`
    });
    expect(dependencies.publicAvatarUrl).toHaveBeenCalledWith(avatarPath);
  });

  it("rejects malformed user IDs before querying public data", async () => {
    const dependencies = { fetchProfile: jest.fn(), fetchPhotos: jest.fn(), signPaths: jest.fn() };
    await expect(fetchPublicProfile("../owner", undefined, dependencies)).rejects.toThrow("프로필");
    expect(dependencies.fetchProfile).not.toHaveBeenCalled();
  });
});
