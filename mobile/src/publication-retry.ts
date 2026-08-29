import type { PublicationDerivative } from "./publication-derivative";
import type { PublicationJob, PublicationJobRepository } from "./publication-job";
import {
  executePersistedPublicationJob,
  isSafePublicationJobForOwner,
  type PublicationRemote,
  type PublicationResult
} from "./publication-publisher";

type PublicationRetryDependencies = {
  readonly repository: PublicationJobRepository;
  readonly remote: PublicationRemote;
  readonly prepare: (assetIds: readonly string[]) => Promise<readonly PublicationDerivative[]>;
  readonly readBytes: (uri: string) => Promise<ArrayBuffer>;
  readonly removeDerivative: (uri: string) => Promise<void>;
  readonly hashShareToken?: (token: string) => Promise<string>;
  readonly now?: () => number;
};

export class PublicationRetryError extends Error {
  public constructor(message = "게시 작업을 안전하게 재시도할 수 없습니다", cause?: unknown) {
    super(message, { cause });
    this.name = "PublicationRetryError";
  }
}

export async function retryPublicationJob(
  input: { readonly ownerId: string; readonly job: PublicationJob },
  dependencies: PublicationRetryDependencies
): Promise<PublicationResult> {
  if (input.job.status !== "failed" || input.job.attempts >= 3 ||
    !isSafePublicationJobForOwner(input.job, input.ownerId)) {
    throw new PublicationRetryError();
  }

  let derivatives: readonly PublicationDerivative[];
  try {
    derivatives = await dependencies.prepare([input.job.deviceAssetId]);
  } catch (cause) {
    throw new PublicationRetryError("기기 원본을 다시 확인하지 못해 게시를 재시도하지 않았습니다", cause);
  }
  const derivative = derivatives[0];
  if (derivatives.length !== 1 || derivative === undefined) {
    await Promise.allSettled(derivatives.map((candidate) => dependencies.removeDerivative(candidate.uri)));
    throw new PublicationRetryError("기기 원본을 다시 확인하지 못해 게시를 재시도하지 않았습니다");
  }

  const succeeded = await executePersistedPublicationJob(
    input.ownerId,
    input.job,
    derivative,
    dependencies
  );
  const result = { succeeded: succeeded ? 1 : 0, failed: succeeded ? 0 : 1, jobIds: [input.job.jobId] };
  return succeeded && input.job.payload.intent === "link" && input.job.payload.shareToken !== null &&
    input.job.payload.shareToken !== undefined
    ? { ...result, shareTokens: [input.job.payload.shareToken] }
    : result;
}
