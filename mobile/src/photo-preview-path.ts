export function isSafePhotoStoragePath(value: unknown): value is string {
  return typeof value === "string" && value.length <= 1024 && value.includes("/") &&
    !value.startsWith("/") && !value.includes("..") && !value.includes("\\");
}

export function getPhotoPreviewPath(row: Readonly<Record<string, unknown>>): string | null {
  if (isSafePhotoStoragePath(row["thumbnail_path"])) return row["thumbnail_path"];
  if (isSafePhotoStoragePath(row["preview_path"])) return row["preview_path"];
  return isSafePhotoStoragePath(row["storage_path"]) ? row["storage_path"] : null;
}
