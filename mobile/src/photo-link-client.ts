import { isPublicationShareToken } from "./publication-link-token";
import { getSupabaseClient } from "./supabase-client";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";

export type LinkedPhoto = {
  readonly id: string;
  readonly date: string | null;
  readonly description: string | null;
  readonly liked: number;
  readonly ownerId: string;
  readonly createdAt: string;
  readonly imageUrl: string;
};

type FunctionResult = { readonly data: unknown; readonly error: unknown };
type PhotoLinkFunctions = {
  invoke(name: string, options: { readonly body: { readonly token: string } }): PromiseLike<FunctionResult>;
};

const GENERIC_LINK_ERROR = "공유 링크를 열 수 없습니다.";
const RETRYABLE_LINK_ERROR = "공유 링크를 불러오지 못했습니다.";

export class PhotoLinkLoadError extends Error {
  public constructor(public readonly kind: "retryable" | "unavailable") {
    super(kind === "retryable" ? RETRYABLE_LINK_ERROR : GENERIC_LINK_ERROR);
    this.name = "PhotoLinkLoadError";
  }
}

function isRetryableFunctionError(error: unknown): boolean {
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) return true;
  if (!(error instanceof FunctionsHttpError)) return false;
  const context = error.context as { readonly status?: unknown } | undefined;
  return typeof context?.status === "number" && context.status >= 500;
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function parseLinkedPhoto(value: unknown): LinkedPhoto | null {
  if (typeof value !== "object" || value === null) return null;
  const photo = (value as Record<string, unknown>)["photo"];
  if (typeof photo !== "object" || photo === null) return null;
  const row = photo as Record<string, unknown>;
  if (typeof row["id"] !== "string" || typeof row["ownerId"] !== "string" ||
    typeof row["createdAt"] !== "string" || !Number.isInteger(row["liked"]) || Number(row["liked"]) < 0 ||
    !isHttpUrl(row["imageUrl"]) || !(typeof row["date"] === "string" || row["date"] === null) ||
    !(typeof row["description"] === "string" || row["description"] === null)) return null;
  return {
    id: row["id"], date: row["date"], description: row["description"], liked: Number(row["liked"]),
    ownerId: row["ownerId"], createdAt: row["createdAt"], imageUrl: row["imageUrl"]
  };
}

export async function fetchLinkedPhoto(
  token: string,
  functions: PhotoLinkFunctions = getSupabaseClient().functions
): Promise<LinkedPhoto> {
  if (!isPublicationShareToken(token)) throw new PhotoLinkLoadError("unavailable");
  try {
    const { data, error } = await functions.invoke("photo-link", { body: { token } });
    if (isRetryableFunctionError(error)) throw new PhotoLinkLoadError("retryable");
    const photo = error === null ? parseLinkedPhoto(data) : null;
    if (photo === null) throw new PhotoLinkLoadError("unavailable");
    return photo;
  } catch (error) {
    if (error instanceof PhotoLinkLoadError) throw error;
    if (isRetryableFunctionError(error)) throw new PhotoLinkLoadError("retryable");
    throw new PhotoLinkLoadError("unavailable");
  }
}
