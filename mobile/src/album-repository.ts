import { getSupabaseClient } from "./supabase-client";

export type MobileAlbumVisibility = "private" | "link" | "public";

export type MobileAlbum = {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly note: string;
  readonly visibility: MobileAlbumVisibility;
  readonly coverImageUrl: string | null;
  readonly dateStart: string | null;
  readonly dateEnd: string | null;
  readonly photoCount: number;
  readonly createdAt: string;
};

export type MobileAlbumPhoto = {
  readonly id: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly date: string | null;
  readonly imageUrl: string;
};

export type MobileAlbumDetail = MobileAlbum & { readonly photos: readonly MobileAlbumPhoto[] };

type QueryResult = { readonly rows: unknown; readonly error: unknown };

export type AlbumRepositoryDependencies = {
  readonly fetchAlbumRows: (ownerId: string) => Promise<QueryResult>;
  readonly fetchAssignments: (albumId: string) => Promise<QueryResult>;
  readonly fetchPhotoRows: (albumId: string, photoIds: readonly string[]) => Promise<QueryResult>;
  readonly signPaths: (paths: readonly string[], expiresIn: number) => Promise<{
    readonly urls: ReadonlyMap<string, string>;
    readonly error: unknown;
  }>;
};

const ALBUM_COLUMNS = "id,owner_id,title,note,visibility,cover_url,date_start,date_end,photo_count,created_at";
const PHOTO_COLUMNS = "id,title,description,date,created_at,storage_path,album_id";
const GENERIC_ALBUM_ERROR = "앨범을 불러오지 못했어요.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeStoragePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 1024) return null;
  if (/^https?:\/\//iu.test(trimmed)) {
    try {
      const path = decodeURIComponent(new URL(trimmed).pathname);
      const match = path.match(/\/storage\/v1\/object\/(?:sign|authenticated|public)\/photos\/(.+)$/u);
      return match?.[1] && !match[1].includes("..") ? match[1] : null;
    } catch {
      return null;
    }
  }
  return trimmed.includes("/") && !trimmed.startsWith("/") && !trimmed.includes("..") && !trimmed.includes("\\")
    ? trimmed
    : null;
}

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseAlbum(row: unknown, signedCover: string | undefined): MobileAlbum | null {
  if (!isRecord(row) || typeof row["id"] !== "string" || typeof row["owner_id"] !== "string" ||
      typeof row["title"] !== "string" || typeof row["created_at"] !== "string" ||
      !["private", "link", "public"].includes(String(row["visibility"]))) return null;
  const count = Number(row["photo_count"]);
  if (!Number.isInteger(count) || count < 0) return null;
  const coverImageUrl = signedCover ?? safeHttpsUrl(row["cover_url"]);
  return {
    id: row["id"],
    ownerId: row["owner_id"],
    title: row["title"].trim() || "이름 없는 앨범",
    note: typeof row["note"] === "string" ? row["note"].trim() : "",
    visibility: row["visibility"] as MobileAlbumVisibility,
    coverImageUrl,
    dateStart: nullableText(row["date_start"]),
    dateEnd: nullableText(row["date_end"]),
    photoCount: count,
    createdAt: row["created_at"]
  };
}

function parsePhoto(row: unknown, imageUrl: string | undefined): MobileAlbumPhoto | null {
  if (!isRecord(row) || typeof row["id"] !== "string" || typeof imageUrl !== "string") return null;
  if (safeHttpsUrl(imageUrl) === null) return null;
  return {
    id: row["id"],
    title: nullableText(row["title"]),
    description: nullableText(row["description"]),
    date: nullableText(row["date"]),
    imageUrl
  };
}

const defaultDependencies: AlbumRepositoryDependencies = {
  async fetchAlbumRows(ownerId) {
    const { data, error } = await getSupabaseClient().from("albums").select(ALBUM_COLUMNS)
      .eq("owner_id", ownerId).order("created_at", { ascending: false });
    return { rows: data, error };
  },
  async fetchAssignments(albumId) {
    const { data, error } = await getSupabaseClient().from("album_photos")
      .select("album_id,photo_id,sort_order").eq("album_id", albumId)
      .order("sort_order", { ascending: true });
    return { rows: data, error };
  },
  async fetchPhotoRows(albumId, photoIds) {
    let query = getSupabaseClient().from("photos").select(PHOTO_COLUMNS);
    query = photoIds.length > 0 ? query.in("id", [...photoIds]) : query.eq("album_id", albumId);
    const { data, error } = await query.order("created_at", { ascending: true });
    return { rows: data, error };
  },
  async signPaths(paths, expiresIn) {
    const { data, error } = await getSupabaseClient().storage.from("photos").createSignedUrls([...paths], expiresIn);
    return {
      urls: new Map((data ?? []).flatMap((entry) =>
        typeof entry.path === "string" && typeof entry.signedUrl === "string" ? [[entry.path, entry.signedUrl]] : []
      )),
      error
    };
  }
};

export async function fetchOwnedAlbums(
  ownerId: string,
  dependencies: AlbumRepositoryDependencies = defaultDependencies
): Promise<readonly MobileAlbum[]> {
  if (ownerId.trim().length === 0) throw new Error(GENERIC_ALBUM_ERROR);
  const result = await dependencies.fetchAlbumRows(ownerId);
  if (result.error !== null || !Array.isArray(result.rows)) throw new Error(GENERIC_ALBUM_ERROR);
  const coverPaths = [...new Set(result.rows.map((row) => isRecord(row) ? safeStoragePath(row["cover_url"]) : null)
    .filter((path): path is string => path !== null))];
  const signed = coverPaths.length === 0
    ? { urls: new Map<string, string>(), error: null }
    : await dependencies.signPaths(coverPaths, 300);
  if (signed.error !== null) throw new Error(GENERIC_ALBUM_ERROR);
  const albums = result.rows.map((row) => {
    const path = isRecord(row) ? safeStoragePath(row["cover_url"]) : null;
    return parseAlbum(row, path === null ? undefined : signed.urls.get(path));
  });
  if (albums.some((album) => album === null)) throw new Error(GENERIC_ALBUM_ERROR);
  return albums as MobileAlbum[];
}

export async function fetchOwnedAlbumDetail(
  albumId: string,
  ownerId: string,
  dependencies: AlbumRepositoryDependencies = defaultDependencies
): Promise<MobileAlbumDetail> {
  const album = (await fetchOwnedAlbums(ownerId, dependencies)).find((item) => item.id === albumId);
  if (album === undefined) throw new Error(GENERIC_ALBUM_ERROR);
  const assignmentsResult = await dependencies.fetchAssignments(albumId);
  if (assignmentsResult.error !== null || !Array.isArray(assignmentsResult.rows)) throw new Error(GENERIC_ALBUM_ERROR);
  const assignments = assignmentsResult.rows.filter(isRecord)
    .filter((row) => typeof row["photo_id"] === "string")
    .sort((left, right) => Number(left["sort_order"] ?? 0) - Number(right["sort_order"] ?? 0));
  const photoIds = assignments.map((row) => row["photo_id"] as string);
  const photoResult = await dependencies.fetchPhotoRows(albumId, photoIds);
  if (photoResult.error !== null || !Array.isArray(photoResult.rows)) throw new Error(GENERIC_ALBUM_ERROR);
  const paths = photoResult.rows.map((row) => isRecord(row) ? safeStoragePath(row["storage_path"]) : null);
  if (!paths.every((path): path is string => path !== null)) throw new Error(GENERIC_ALBUM_ERROR);
  const signed = paths.length === 0
    ? { urls: new Map<string, string>(), error: null }
    : await dependencies.signPaths(paths, 300);
  if (signed.error !== null) throw new Error(GENERIC_ALBUM_ERROR);
  const parsed = photoResult.rows.map((row, index) => {
    const path = paths[index];
    return path === undefined ? null : parsePhoto(row, signed.urls.get(path));
  });
  if (parsed.some((photo) => photo === null)) throw new Error(GENERIC_ALBUM_ERROR);
  const photoById = new Map((parsed as MobileAlbumPhoto[]).map((photo) => [photo.id, photo]));
  const ordered = photoIds.length > 0
    ? photoIds.map((id) => photoById.get(id)).filter((photo): photo is MobileAlbumPhoto => photo !== undefined)
    : parsed as MobileAlbumPhoto[];
  return { ...album, photos: ordered };
}
