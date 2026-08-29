import type { PublicationJob } from "./publication-job";
import { isSafePublicationJobForOwner } from "./publication-publisher";

export type PublicationDeletionDependencies = {
  readonly findLatestPublished: (assetId: string) => Promise<PublicationJob | null>;
  readonly deletePhotoRecord: (photoId: string, ownerId: string) => Promise<void>;
  readonly removeObject: (path: string) => Promise<void>;
  readonly clearLocalJob: (jobId: string) => Promise<void>;
};

export async function deletePublishedPhoto(
  ownerId: string,
  assetId: string,
  dependencies: PublicationDeletionDependencies
): Promise<{ readonly photoId: string }> {
  const job = assetId.trim() === "" ? null : await dependencies.findLatestPublished(assetId);
  if (job === null || job.status !== "succeeded" || !isSafePublicationJobForOwner(job, ownerId)) {
    throw new Error("삭제할 게시 사진을 안전하게 확인하지 못했습니다");
  }

  try {
    await dependencies.deletePhotoRecord(job.payload.photoId, ownerId);
    await dependencies.removeObject(job.payload.objectPath);
    await dependencies.clearLocalJob(job.jobId);
    return { photoId: job.payload.photoId };
  } catch (cause) {
    throw new Error("게시 사진을 삭제하지 못했습니다", { cause });
  }
}
