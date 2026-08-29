import type { DevicePhotoPreview } from "./device-photo-library";

export async function hydrateDevicePhotoThumbnails(
  photos: readonly DevicePhotoPreview[],
  loadThumbnail: (assetId: string) => Promise<string>,
  concurrency = 4
): Promise<readonly DevicePhotoPreview[]> {
  const results: DevicePhotoPreview[] = photos.map((photo) => ({ ...photo }));
  const workerCount = Math.min(
    photos.length,
    Math.max(1, Math.min(8, Number.isInteger(concurrency) ? concurrency : 1))
  );
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < photos.length) {
      const index = nextIndex;
      nextIndex += 1;
      const photo = photos[index];
      if (photo === undefined) continue;
      try {
        results[index] = {
          ...photo,
          thumbnailUri: await loadThumbnail(photo.id)
        };
      } catch (cause) {
        void cause;
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
