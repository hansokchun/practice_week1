import { devicePhotoThumbnailCache } from "./device-photo-thumbnail-cache";

type RegeneratableThumbnailCache = {
  readonly getOrCreate: (assetId: string) => Promise<string>;
  readonly remove: (assetId: string) => Promise<void>;
};

export async function regenerateDevicePhotoThumbnail(
  assetId: string,
  cache: RegeneratableThumbnailCache = devicePhotoThumbnailCache
): Promise<string> {
  if (assetId.trim() === "") throw new TypeError("Device photo asset id is required");
  await cache.remove(assetId);
  return cache.getOrCreate(assetId);
}
