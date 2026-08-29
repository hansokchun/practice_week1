import type { PublicationDerivative } from "./publication-derivative";
import type { PublicationJobRepository } from "./publication-job";
import type { PublicationSelection } from "./publication-selection";
import { isPublicationShareToken } from "./publication-link-token";

type RemotePhotoRecord = {
  readonly id: string;
  readonly owner_id: string;
  readonly storage_path: string;
  readonly visibility: "private" | "public";
  readonly shared: boolean;
  readonly lat: null;
  readonly lng: null;
  readonly geo_source: "unknown";
  readonly location_precision: "hidden";
  readonly description: string;
  readonly date: string;
  readonly link_token_hash: string | null;
  readonly link_token_created_at: string | null;
};

export interface PublicationRemote {
  readonly upload: (input: {
    readonly path: string;
    readonly bytes: ArrayBuffer;
    readonly contentType: "image/jpeg";
    readonly upsert: false;
  }) => Promise<void>;
  readonly insertPhoto: (photo: RemotePhotoRecord) => Promise<void>;
  readonly remove: (path: string) => Promise<void>;
}

type PublishPreparedDependencies = {
  readonly repository: PublicationJobRepository;
  readonly remote: PublicationRemote;
  readonly readBytes: (uri: string) => Promise<ArrayBuffer>;
  readonly removeDerivative: (uri: string) => Promise<void>;
  readonly createId: () => string;
  readonly createShareToken?: () => Promise<string>;
  readonly hashShareToken?: (token: string) => Promise<string>;
  readonly now?: () => number;
};

export type PublicationResult = {
  readonly succeeded: number;
  readonly failed: number;
  readonly jobIds: readonly string[];
  readonly shareTokens?: readonly string[];
};

export class DuplicatePublicationError extends Error {
  public constructor() {
    super("같은 사진의 게시 작업이 이미 진행 중입니다");
    this.name = "DuplicatePublicationError";
  }
}

function validOwnerId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

export function isSafePublicationJobForOwner(job: import("./publication-job").PublicationJob, ownerId: string): boolean {
  const shareTokenIsSafe = job.payload.intent === "link"
    ? isPublicationShareToken(job.payload.shareToken)
    : job.payload.shareToken === undefined || job.payload.shareToken === null;
  return validOwnerId(ownerId) &&
    shareTokenIsSafe &&
    job.payload.photoId === job.jobId &&
    job.payload.objectPath === `${ownerId}/${job.jobId}.jpg`;
}

export async function executePersistedPublicationJob(
  ownerId: string,
  job: import("./publication-job").PublicationJob,
  derivative: PublicationDerivative,
  dependencies: Pick<PublishPreparedDependencies, "repository" | "remote" | "readBytes" | "removeDerivative"> & {
    readonly now?: () => number;
    readonly hashShareToken?: (token: string) => Promise<string>;
  }
): Promise<boolean> {
  if (!isSafePublicationJobForOwner(job, ownerId) ||
    derivative.assetId !== job.deviceAssetId || derivative.metadataPolicy !== "stripped") {
    await dependencies.removeDerivative(derivative.uri).catch(() => undefined);
    throw new TypeError("A safe persisted publication job is required");
  }
  const timestamp = (dependencies.now ?? Date.now)();
  const rawShareToken = job.payload.intent === "link" ? job.payload.shareToken : null;
  let linkTokenHash: string | null = null;
  if (rawShareToken !== null && rawShareToken !== undefined) {
    if (dependencies.hashShareToken === undefined) {
      await dependencies.removeDerivative(derivative.uri).catch(() => undefined);
      throw new TypeError("A safe publication link token hash is required");
    }
    linkTokenHash = await dependencies.hashShareToken(rawShareToken);
  }
  if (rawShareToken !== null && rawShareToken !== undefined && !isPublicationShareToken(linkTokenHash)) {
    await dependencies.removeDerivative(derivative.uri).catch(() => undefined);
    throw new TypeError("A safe publication link token hash is required");
  }
  let attempts = job.attempts;
  let uploaded = false;
  try {
    attempts = await dependencies.repository.markRunning(job.jobId, timestamp);
    const bytes = await dependencies.readBytes(derivative.uri);
    await dependencies.remote.upload({
      path: job.payload.objectPath,
      bytes,
      contentType: "image/jpeg",
      upsert: false
    });
    uploaded = true;
    await dependencies.remote.insertPhoto({
      id: job.payload.photoId,
      owner_id: ownerId,
      storage_path: job.payload.objectPath,
      visibility: job.payload.intent === "public" ? "public" : "private",
      shared: job.payload.intent === "public",
      lat: null,
      lng: null,
      geo_source: "unknown",
      location_precision: "hidden",
      description: "",
      date: new Date(job.createdAt).toISOString(),
      link_token_hash: linkTokenHash,
      link_token_created_at: linkTokenHash === null ? null : new Date(job.createdAt).toISOString()
    });
    await dependencies.repository.markSucceeded(job.jobId, timestamp);
    return true;
  } catch (cause) {
    void cause;
    if (uploaded) await dependencies.remote.remove(job.payload.objectPath).catch(() => undefined);
    await dependencies.repository.markFailed(job.jobId, Math.max(1, attempts), timestamp);
    return false;
  } finally {
    await dependencies.removeDerivative(derivative.uri).catch(() => undefined);
  }
}

export async function publishPreparedSelection(
  input: {
    readonly ownerId: string;
    readonly selection: PublicationSelection;
    readonly derivatives: readonly PublicationDerivative[];
  },
  dependencies: PublishPreparedDependencies
): Promise<PublicationResult> {
  if (!validOwnerId(input.ownerId) || input.derivatives.length !== input.selection.assetIds.length) {
    throw new TypeError("A valid authenticated publication is required");
  }
  if (input.selection.intent === "link" &&
    (dependencies.createShareToken === undefined || dependencies.hashShareToken === undefined)) {
    await Promise.allSettled(input.derivatives.map((derivative) => dependencies.removeDerivative(derivative.uri)));
    throw new TypeError("Secure publication link token dependencies are required");
  }
  const openJobs = await Promise.all(input.selection.assetIds.map((assetId) =>
    dependencies.repository.findOpen(assetId, input.selection.intent)
  ));
  if (openJobs.some((job) => job !== null)) {
    await Promise.allSettled(input.derivatives.map((derivative) => dependencies.removeDerivative(derivative.uri)));
    throw new DuplicatePublicationError();
  }

  let succeeded = 0;
  let failed = 0;
  const jobIds: string[] = [];
  const shareTokens: string[] = [];
  for (const assetId of input.selection.assetIds) {
    const derivative = input.derivatives.find((candidate) => candidate.assetId === assetId);
    if (derivative === undefined || derivative.metadataPolicy !== "stripped") {
      throw new TypeError("A verified publication derivative is required");
    }
    const jobId = dependencies.createId();
    const timestamp = (dependencies.now ?? Date.now)();
    const objectPath = `${input.ownerId}/${jobId}.jpg`;
    let shareToken: string | null = null;
    if (input.selection.intent === "link") {
      if (dependencies.createShareToken === undefined) {
        await dependencies.removeDerivative(derivative.uri).catch(() => undefined);
        throw new TypeError("A secure publication share token is required");
      }
      shareToken = await dependencies.createShareToken();
    }
    if (input.selection.intent === "link" && !isPublicationShareToken(shareToken)) {
      await dependencies.removeDerivative(derivative.uri).catch(() => undefined);
      throw new TypeError("A secure publication share token is required");
    }
    try {
      const job = await dependencies.repository.enqueue({
        jobId,
        deviceAssetId: assetId,
        intent: input.selection.intent,
        objectPath,
        photoId: jobId,
        shareToken,
        createdAt: timestamp
      });
      jobIds.push(jobId);
      const completed = await executePersistedPublicationJob(input.ownerId, job, derivative, dependencies);
      if (completed) succeeded += 1;
      else failed += 1;
      if (completed && shareToken !== null && shareToken !== undefined) shareTokens.push(shareToken);
    } catch (cause) {
      await dependencies.removeDerivative(derivative.uri).catch(() => undefined);
      throw cause;
    }
  }
  return shareTokens.length === 0
    ? { succeeded, failed, jobIds }
    : { succeeded, failed, jobIds, shareTokens };
}
