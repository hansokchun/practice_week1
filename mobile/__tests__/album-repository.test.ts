import { fetchOwnedAlbumDetail, fetchOwnedAlbums } from "../src/album-repository";

const albumRow = {
  id: "album-a",
  owner_id: "owner-a",
  title: "제주 여행",
  note: "바다와 오름",
  visibility: "private",
  cover_url: "owner-a/cover.jpg",
  date_start: "2026-08-01",
  date_end: "2026-08-03",
  photo_count: 2,
  created_at: "2026-08-04T00:00:00.000Z"
};

describe("read-only mobile album repository", () => {
  it("loads only the current owner's albums and signs private covers", async () => {
    const fetchAlbumRows = jest.fn(async () => ({ rows: [albumRow], error: null }));
    const signPaths = jest.fn(async () => ({
      urls: new Map([["owner-a/cover.jpg", "https://example.com/signed-cover"]]),
      error: null
    }));

    await expect(fetchOwnedAlbums("owner-a", {
      fetchAlbumRows,
      fetchAssignments: jest.fn(),
      fetchPhotoRows: jest.fn(),
      signPaths
    })).resolves.toEqual([expect.objectContaining({
      id: "album-a",
      title: "제주 여행",
      coverImageUrl: "https://example.com/signed-cover",
      photoCount: 2
    })]);
    expect(fetchAlbumRows).toHaveBeenCalledWith("owner-a");
    expect(signPaths).toHaveBeenCalledWith(["owner-a/cover.jpg"], 300);
  });

  it("loads album photos in saved order without exposing provider errors", async () => {
    const dependencies = {
      fetchAlbumRows: jest.fn(async () => ({ rows: [albumRow], error: null })),
      fetchAssignments: jest.fn(async () => ({
        rows: [
          { album_id: "album-a", photo_id: "photo-b", sort_order: 0 },
          { album_id: "album-a", photo_id: "photo-a", sort_order: 1 }
        ],
        error: null
      })),
      fetchPhotoRows: jest.fn(async () => ({
        rows: [
          { id: "photo-a", title: null, description: "오름", date: "2026-08-02", created_at: "2026-08-04T00:00:00.000Z", storage_path: "owner-a/a.jpg" },
          { id: "photo-b", title: null, description: "바다", date: "2026-08-01", created_at: "2026-08-04T00:00:00.000Z", storage_path: "owner-a/b.jpg" }
        ],
        error: null
      })),
      signPaths: jest.fn(async (paths: readonly string[]) => ({
        urls: new Map(paths.map((path) => [path, `https://example.com/${path.split("/").at(-1)}`])),
        error: null
      }))
    };

    const detail = await fetchOwnedAlbumDetail("album-a", "owner-a", dependencies);
    expect(detail.photos.map((photo) => photo.id)).toEqual(["photo-b", "photo-a"]);
    expect(detail.photos[0]?.imageUrl).toBe("https://example.com/b.jpg");

    await expect(fetchOwnedAlbums("owner-a", {
      ...dependencies,
      fetchAlbumRows: async () => ({ rows: null, error: new Error("private") })
    })).rejects.toThrow("앨범을 불러오지 못했어요.");
  });
});
