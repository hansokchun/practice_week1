import { getSupabaseClient } from "./supabase-client";

export type LikedPhoto = {
  readonly id: string;
  readonly date: string | null;
  readonly description: string | null;
  readonly imageUrl: string;
  readonly createdAt: string;
};

type LikedPhotoDependencies = {
  readonly fetchLikedIds: (signal?: AbortSignal) => Promise<{ readonly ids: unknown; readonly error: unknown }>;
  readonly fetchPublicPhotos: (ids: readonly string[], signal?: AbortSignal) => Promise<{ readonly rows: unknown; readonly error: unknown }>;
  readonly signPaths: (paths: readonly string[], expiresIn: number, signal?: AbortSignal) => Promise<{
    readonly urls: ReadonlyMap<string, string>;
    readonly error: unknown;
  }>;
};

type LikeRpc = (name: string, parameters: { readonly target_photo_id: string; readonly should_like: boolean }) => PromiseLike<{
  readonly data: unknown;
  readonly error: unknown;
}>;

const GENERIC_LIKES_ERROR = "좋아요 사진을 불러오지 못했습니다.";
const GENERIC_MUTATION_ERROR = "좋아요를 변경하지 못했습니다.";

function isPhotoId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,128}$/u.test(value) && !value.includes("..");
}

function isSafeStoragePath(value: unknown): value is string {
  return typeof value === "string" && value.length <= 1024 && value.includes("/") &&
    !value.startsWith("/") && !value.includes("..") && !value.includes("\\");
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
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

const defaultDependencies: LikedPhotoDependencies = {
  async fetchLikedIds(signal) {
    let query = getSupabaseClient().from("user_likes").select("photo_id").order("created_at", { ascending: false }).limit(100);
    if (signal !== undefined) query = query.abortSignal(signal);
    const { data, error } = await query;
    return { ids: (data ?? []).map((row) => row.photo_id), error };
  },
  async fetchPublicPhotos(ids, signal) {
    let query = getSupabaseClient()
      .from("photos")
      .select("id,date,description,storage_path,created_at")
      .in("id", [...ids])
      .eq("visibility", "public");
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
  }
};

export async function fetchLikedPhotos(
  signal?: AbortSignal,
  dependencies: LikedPhotoDependencies = defaultDependencies
): Promise<readonly LikedPhoto[]> {
  try {
    const likedResult = await dependencies.fetchLikedIds(signal);
    if (likedResult.error !== null || !Array.isArray(likedResult.ids) || !likedResult.ids.every(isPhotoId)) {
      throw new Error(GENERIC_LIKES_ERROR);
    }
    const ids = [...new Set(likedResult.ids)];
    if (ids.length === 0) return [];
    const photoResult = await dependencies.fetchPublicPhotos(ids, signal);
    if (photoResult.error !== null || !Array.isArray(photoResult.rows)) throw new Error(GENERIC_LIKES_ERROR);
    const byId = new Map(photoResult.rows.flatMap((value) => {
      if (typeof value !== "object" || value === null) return [];
      const row = value as Record<string, unknown>;
      return isPhotoId(row["id"]) ? [[row["id"], row] as const] : [];
    }));
    const publicRows = ids.flatMap((id) => {
      const row = byId.get(id);
      return row === undefined ? [] : [row];
    });
    const paths = publicRows.map((row) => row["storage_path"]);
    if (!paths.every(isSafeStoragePath)) throw new Error(GENERIC_LIKES_ERROR);
    if (paths.length === 0) return [];
    const signed = await dependencies.signPaths(paths, 300, signal);
    if (signed.error !== null) throw new Error(GENERIC_LIKES_ERROR);
    const photos = publicRows.map((row, index) => {
      const path = paths[index];
      const imageUrl = typeof path === "string" ? signed.urls.get(path) : undefined;
      if (!isPhotoId(row["id"]) || !isHttpUrl(imageUrl) || typeof row["created_at"] !== "string" ||
        !(typeof row["date"] === "string" || row["date"] === null) ||
        !(typeof row["description"] === "string" || row["description"] === null)) return null;
      return {
        id: row["id"], date: row["date"], description: row["description"], imageUrl, createdAt: row["created_at"]
      };
    });
    if (photos.some((photo) => photo === null)) throw new Error(GENERIC_LIKES_ERROR);
    return photos as LikedPhoto[];
  } catch (error) {
    if (signal?.aborted === true || (typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError")) {
      throw abortError();
    }
    throw new Error(GENERIC_LIKES_ERROR);
  }
}

export async function setPhotoLiked(
  photoId: string,
  shouldLike: boolean,
  invoke: LikeRpc = (name, parameters) => getSupabaseClient().rpc(name, parameters)
): Promise<number> {
  if (!isPhotoId(photoId)) throw new Error(GENERIC_MUTATION_ERROR);
  try {
    const { data, error } = await invoke("set_photo_like", { target_photo_id: photoId, should_like: shouldLike });
    if (error !== null || !Number.isInteger(data) || Number(data) < 0) throw new Error(GENERIC_MUTATION_ERROR);
    return Number(data);
  } catch {
    throw new Error(GENERIC_MUTATION_ERROR);
  }
}
