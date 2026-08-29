import { devicePhotoThumbnailCache } from "./device-photo-thumbnail-cache";
import { publicationDerivativeRuntime } from "./publication-derivative-runtime";

export type AccountLocalCleanupDependencies = {
  readonly clearThumbnails: () => Promise<void>;
  readonly clearDerivatives: () => Promise<unknown>;
};

const defaultDependencies: AccountLocalCleanupDependencies = {
  clearThumbnails: () => devicePhotoThumbnailCache.clear(),
  clearDerivatives: () => publicationDerivativeRuntime.clear()
};

export async function clearLocalAccountData(
  dependencies: AccountLocalCleanupDependencies = defaultDependencies
): Promise<void> {
  try {
    await dependencies.clearThumbnails();
    await dependencies.clearDerivatives();
  } catch {
    throw new Error("기기 데이터를 정리하지 못했습니다.");
  }
}
