import { getSupabaseClient } from "./supabase-client";

export type PublicLocationPrecision = "hidden" | "approximate" | "exact";

export type PublicPhotoDetail = {
  readonly id: string;
  readonly date: string | null;
  readonly description: string | null;
  readonly liked: number;
  readonly owner: {
    readonly id: string;
    readonly displayName: string;
    readonly avatarUrl: string | null;
  };
  readonly createdAt: string;
  readonly imageUrl: string;
  readonly location?: { readonly lat: number; readonly lng: number };
  readonly locationPrecision: PublicLocationPrecision;
  readonly visibility?: "private" | "link" | "public";
  readonly viewerHasLiked: boolean;
};

type PublicPhotoDetailDependencies = {
  readonly fetchPhoto: (photoId: string, signal?: AbortSignal) => Promise<{ readonly row: unknown; readonly error: unknown }>;
  readonly fetchProfile: (ownerId: string, signal?: AbortSignal) => Promise<{ readonly row: unknown; readonly error: unknown }>;
  readonly fetchViewerLike: (photoId: string, signal?: AbortSignal) => Promise<{ readonly liked: boolean; readonly error: unknown }>;
  readonly fetchPrivateLocation?: (photoId: string, ownerId: string, signal?: AbortSignal) => Promise<{ readonly row: unknown; readonly error: unknown }>;
  readonly signPath: (path: string, expiresIn: number, signal?: AbortSignal) => Promise<{ readonly url: unknown; readonly error: unknown }>;
};

const GENERIC_DETAIL_ERROR = "공개 사진을 불러오지 못했습니다.";
const PHOTO_COLUMNS = "id,date,description,liked,owner_id,created_at,storage_path,location_precision,lat,lng,visibility";

function isSafePhotoId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{1,128}$/u.test(value) && !value.includes("..");
}

function isSafeStoragePath(value: unknown): value is string {
  return typeof value === "string" && value.length <= 1024 && value.includes("/") &&
    !value.startsWith("/") && !value.includes("..") && !value.includes("\\");
}

function parseHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol) ? value : null;
  } catch {
    return null;
  }
}

function abortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted === true) throw abortError();
}

const defaultDependencies: PublicPhotoDetailDependencies = {
  async fetchPhoto(photoId, signal) {
    let query = getSupabaseClient()
      .from("photos")
      .select(PHOTO_COLUMNS)
      .eq("id", photoId);
    if (signal !== undefined) query = query.abortSignal(signal);
    const { data, error } = await query.maybeSingle();
    return { row: data, error };
  },
  async fetchProfile(ownerId, signal) {
    let query = getSupabaseClient()
      .from("profiles")
      .select("nickname,avatar_url")
      .eq("id", ownerId);
    if (signal !== undefined) query = query.abortSignal(signal);
    const { data, error } = await query.maybeSingle();
    return { row: data, error };
  },
  async fetchViewerLike(photoId, signal) {
    let query = getSupabaseClient().from("user_likes").select("photo_id").eq("photo_id", photoId);
    if (signal !== undefined) query = query.abortSignal(signal);
    const { data, error } = await query.maybeSingle();
    return { liked: data !== null, error };
  },
  async fetchPrivateLocation(photoId, ownerId, signal) {
    let query = getSupabaseClient()
      .from("photo_private_locations")
      .select("lat,lng")
      .eq("photo_id", photoId)
      .eq("owner_id", ownerId);
    if (signal !== undefined) query = query.abortSignal(signal);
    const { data, error } = await query.maybeSingle();
    return { row: data, error };
  },
  async signPath(path, expiresIn, signal) {
    throwIfAborted(signal);
    const { data, error } = await getSupabaseClient().storage.from("photos").createSignedUrl(path, expiresIn);
    throwIfAborted(signal);
    return { url: data?.signedUrl, error };
  }
};

export async function fetchPublicPhotoDetail(
  photoId: string,
  signal?: AbortSignal,
  dependencies: PublicPhotoDetailDependencies = defaultDependencies,
  viewerId: string | null = null
): Promise<PublicPhotoDetail> {
  if (!isSafePhotoId(photoId)) throw new Error(GENERIC_DETAIL_ERROR);
  throwIfAborted(signal);
  try {
    const { row, error } = await dependencies.fetchPhoto(photoId, signal);
    if (error !== null || typeof row !== "object" || row === null) throw new Error(GENERIC_DETAIL_ERROR);
    const photo = row as Record<string, unknown>;
    if (photo["id"] !== photoId || typeof photo["owner_id"] !== "string" ||
      typeof photo["created_at"] !== "string" || !isSafeStoragePath(photo["storage_path"]) ||
      !Number.isInteger(photo["liked"]) || Number(photo["liked"]) < 0 ||
      !(typeof photo["date"] === "string" || photo["date"] === null) ||
      !(typeof photo["description"] === "string" || photo["description"] === null) ||
      !["hidden", "approximate", "exact"].includes(String(photo["location_precision"])) ||
      !["private", "link", "public"].includes(String(photo["visibility"]))) {
      throw new Error(GENERIC_DETAIL_ERROR);
    }
    const isOwner = viewerId !== null && photo["owner_id"] === viewerId;
    if (photo["visibility"] !== "public" && !isOwner) throw new Error(GENERIC_DETAIL_ERROR);

    const [profileResult, likeResult, signedResult, privateLocationResult] = await Promise.all([
      dependencies.fetchProfile(photo["owner_id"], signal),
      dependencies.fetchViewerLike(photoId, signal),
      dependencies.signPath(photo["storage_path"], 300, signal),
      isOwner && dependencies.fetchPrivateLocation !== undefined
        ? dependencies.fetchPrivateLocation(photoId, photo["owner_id"], signal)
        : Promise.resolve({ row: null, error: null })
    ]);
    throwIfAborted(signal);
    if (profileResult.error !== null || signedResult.error !== null) throw new Error(GENERIC_DETAIL_ERROR);
    const profile = typeof profileResult.row === "object" && profileResult.row !== null
      ? profileResult.row as Record<string, unknown>
      : {};
    const imageUrl = parseHttpUrl(signedResult.url);
    if (imageUrl === null) throw new Error(GENERIC_DETAIL_ERROR);
    const nickname = typeof profile["nickname"] === "string" && profile["nickname"].trim().length > 0
      ? profile["nickname"].trim().slice(0, 80)
      : "Ikkyee 여행자";
    const rawAvatar = profile["avatar_url"];
    const avatarUrl = typeof rawAvatar === "string" && rawAvatar.length === 0 ? null : parseHttpUrl(rawAvatar);
    const precision = photo["location_precision"] as PublicLocationPrecision;
    const hasPublicLocation = precision !== "hidden" && typeof photo["lat"] === "number" && Number.isFinite(photo["lat"]) &&
      typeof photo["lng"] === "number" && Number.isFinite(photo["lng"]);
    if (precision !== "hidden" && !hasPublicLocation) throw new Error(GENERIC_DETAIL_ERROR);
    const privateLocation = typeof privateLocationResult.row === "object" && privateLocationResult.row !== null
      ? privateLocationResult.row as Record<string, unknown>
      : null;
    const hasPrivateLocation = isOwner && privateLocationResult.error === null && privateLocation !== null &&
      typeof privateLocation["lat"] === "number" && Number.isFinite(privateLocation["lat"]) &&
      typeof privateLocation["lng"] === "number" && Number.isFinite(privateLocation["lng"]);

    return {
      id: photoId,
      date: photo["date"] as string | null,
      description: photo["description"] as string | null,
      liked: Number(photo["liked"]),
      owner: { id: photo["owner_id"], displayName: nickname, avatarUrl },
      createdAt: photo["created_at"],
      imageUrl,
      ...(hasPrivateLocation
        ? { location: { lat: privateLocation["lat"] as number, lng: privateLocation["lng"] as number } }
        : hasPublicLocation ? { location: { lat: photo["lat"] as number, lng: photo["lng"] as number } } : {}),
      locationPrecision: precision,
      visibility: photo["visibility"] as "private" | "link" | "public",
      viewerHasLiked: likeResult.error === null && likeResult.liked
    };
  } catch (error) {
    if (signal?.aborted === true || (typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError")) {
      throw abortError();
    }
    throw new Error(GENERIC_DETAIL_ERROR);
  }
}
