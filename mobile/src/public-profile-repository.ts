import { getSupabaseClient } from "./supabase-client";
import { getPhotoPreviewPath, isSafePhotoStoragePath } from "./photo-preview-path";

export type PublicProfile = {
  readonly displayName: string;
  readonly bio: string;
  readonly avatarUrl: string | null;
  readonly photos: readonly {
    readonly id: string;
    readonly description: string | null;
    readonly imageUrl: string;
  }[];
};

type PublicProfileDependencies = {
  readonly fetchProfile: (userId: string, signal?: AbortSignal) => Promise<{ readonly row: unknown; readonly error: unknown }>;
  readonly fetchPhotos: (userId: string, limit: number, signal?: AbortSignal) => Promise<{ readonly rows: unknown; readonly error: unknown }>;
  readonly signPaths: (paths: readonly string[], expiresIn: number, signal?: AbortSignal) => Promise<{
    readonly urls: ReadonlyMap<string, string>;
    readonly error: unknown;
  }>;
  readonly publicAvatarUrl?: (path: string) => string | null;
};

const GENERIC_PROFILE_ERROR = "공개 프로필을 불러오지 못했습니다.";

function isUserId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function httpUrl(value: unknown): string | null {
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

const defaultDependencies: PublicProfileDependencies = {
  async fetchProfile(userId, signal) {
    let query = getSupabaseClient().from("profiles").select("nickname,bio,avatar_url,avatar_path").eq("id", userId);
    if (signal !== undefined) query = query.abortSignal(signal);
    const { data, error } = await query.maybeSingle();
    return { row: data, error };
  },
  async fetchPhotos(userId, limit, signal) {
    let query = getSupabaseClient()
      .from("photos")
      .select("id,description,storage_path,thumbnail_path")
      .eq("owner_id", userId)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (signal !== undefined) query = query.abortSignal(signal);
    const { data, error } = await query;
    return { rows: data, error };
  },
  async signPaths(paths, expiresIn, signal) {
    throwIfAborted(signal);
    const { data, error } = await getSupabaseClient().storage.from("photos").createSignedUrls([...paths], expiresIn);
    throwIfAborted(signal);
    return {
      urls: new Map((data ?? []).flatMap((entry) =>
        typeof entry.path === "string" && typeof entry.signedUrl === "string" ? [[entry.path, entry.signedUrl]] : []
      )),
      error
    };
  },
  publicAvatarUrl(path) {
    return httpUrl(getSupabaseClient().storage.from("avatars").getPublicUrl(path).data.publicUrl);
  }
};

export async function fetchPublicProfile(
  userId: string,
  signal?: AbortSignal,
  dependencies: PublicProfileDependencies = defaultDependencies
): Promise<PublicProfile> {
  if (!isUserId(userId)) throw new Error(GENERIC_PROFILE_ERROR);
  throwIfAborted(signal);
  try {
    const [profileResult, photosResult] = await Promise.all([
      dependencies.fetchProfile(userId, signal),
      dependencies.fetchPhotos(userId, 12, signal)
    ]);
    if (profileResult.error !== null || photosResult.error !== null ||
      typeof profileResult.row !== "object" || profileResult.row === null || !Array.isArray(photosResult.rows)) {
      throw new Error(GENERIC_PROFILE_ERROR);
    }
    const profile = profileResult.row as Record<string, unknown>;
    const paths = photosResult.rows.map((row) => typeof row === "object" && row !== null
      ? getPhotoPreviewPath(row as Record<string, unknown>)
      : null);
    if (!paths.every(isSafePhotoStoragePath)) throw new Error(GENERIC_PROFILE_ERROR);
    const signed = paths.length === 0
      ? { urls: new Map<string, string>(), error: null }
      : await dependencies.signPaths(paths, 300, signal);
    if (signed.error !== null) throw new Error(GENERIC_PROFILE_ERROR);
    const photos = photosResult.rows.map((value, index) => {
      if (typeof value !== "object" || value === null) return null;
      const row = value as Record<string, unknown>;
      const path = paths[index];
      const imageUrl = typeof path === "string" ? signed.urls.get(path) : undefined;
      if (typeof row["id"] !== "string" || imageUrl === undefined || httpUrl(imageUrl) === null ||
        !(typeof row["description"] === "string" || row["description"] === null)) return null;
      return { id: row["id"], description: row["description"], imageUrl };
    });
    if (photos.some((photo) => photo === null)) throw new Error(GENERIC_PROFILE_ERROR);
    const displayName = typeof profile["nickname"] === "string" && profile["nickname"].trim().length > 0
      ? profile["nickname"].trim().slice(0, 80)
      : "Ikkyee 여행자";
    const bio = typeof profile["bio"] === "string" ? profile["bio"].trim().slice(0, 300) : "";
    const managedPath = typeof profile["avatar_path"] === "string" && profile["avatar_path"].startsWith(`${userId}/avatar-`) && profile["avatar_path"].endsWith(".jpg")
      ? profile["avatar_path"] : null;
    const managedUrl = managedPath === null ? null : (dependencies.publicAvatarUrl ?? defaultDependencies.publicAvatarUrl)?.(managedPath) ?? null;
    const avatarUrl = httpUrl(managedUrl) ?? (typeof profile["avatar_url"] === "string" && profile["avatar_url"].length > 0
      ? httpUrl(profile["avatar_url"])
      : null);
    return { displayName, bio, avatarUrl, photos: photos as PublicProfile["photos"] };
  } catch (error) {
    if (signal?.aborted === true || (typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError")) {
      throw abortError();
    }
    throw new Error(GENERIC_PROFILE_ERROR);
  }
}
