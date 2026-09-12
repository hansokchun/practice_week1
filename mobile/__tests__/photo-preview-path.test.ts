import { getPhotoPreviewPath } from "../src/photo-preview-path";

it("prefers a thumbnail then prepared preview before using the legacy original", () => {
  const row = { thumbnail_path: "a/thumbnails/p.jpg", preview_path: "a/previews/p.jpg", storage_path: "a/p.jpg" };
  expect(getPhotoPreviewPath(row)).toBe(row.thumbnail_path);
  expect(getPhotoPreviewPath({ ...row, thumbnail_path: null })).toBe(row.preview_path);
  expect(getPhotoPreviewPath({ ...row, thumbnail_path: "../bad", preview_path: null })).toBe(row.storage_path);
  expect(getPhotoPreviewPath({ preview_path: "../bad" })).toBeNull();
});
