import { getSupabaseClient } from "./supabase-client";
import type { ExplorePhotoScope } from "./explore-photo-scope";

export type ExploreBounds = {
  readonly north: number;
  readonly south: number;
  readonly east: number;
  readonly west: number;
};

export type ExplorePhoto = {
  readonly id: string;
  readonly date: string | null;
  readonly description: string | null;
  readonly liked: number;
  readonly ownerId: string;
  readonly createdAt: string;
  readonly imageUrl: string;
  readonly lat: number;
  readonly lng: number;
  readonly locationPrecision?: "hidden" | "approximate" | "exact";
  readonly visibility?: "private" | "link" | "public";
};

export type ExplorePhotoPage = {
  readonly photos: readonly ExplorePhoto[];
  readonly hasMore: boolean;
  readonly nextOffset: number;
};

export const SEOUL_EXPLORE_BOUNDS: ExploreBounds = {
  north: 37.72,
  south: 37.42,
  east: 127.18,
  west: 126.76
};

type FetchRowsInput = {
  readonly bounds: ExploreBounds;
  readonly offset: number;
  readonly limit: number;
  readonly scope: ExplorePhotoScope;
  readonly viewerId: string | null;
  readonly signal?: AbortSignal | undefined;
};
type ExploreRepositoryDependencies = {
  readonly fetchRows: (input: FetchRowsInput) => Promise<{ readonly rows: unknown; readonly error: unknown }>;
  readonly signPaths: (paths: readonly string[], expiresIn: number, signal?: AbortSignal) => Promise<{
    readonly urls: ReadonlyMap<string, string>;
    readonly error: unknown;
  }>;
};

type OwnedPhotoBoundsDependencies = {
  readonly fetchLocations: (viewerId: string, signal?: AbortSignal) => Promise<{ readonly rows: unknown; readonly error: unknown }>;
};

type PublicPhotoBoundsDependencies = {
  readonly fetchLocations: (signal?: AbortSignal) => Promise<{ readonly rows: unknown; readonly error: unknown }>;
};

const GENERIC_EXPLORE_ERROR = "공개 사진을 불러오지 못했습니다.";
const PHOTO_COLUMNS = "id,date,description,liked,owner_id,created_at,storage_path,lat,lng,location_precision,visibility";

function isSafeStoragePath(value: unknown): value is string {
  return typeof value === "string" && value.length <= 1024 && value.includes("/") &&
    !value.startsWith("/") && !value.includes("..") && !value.includes("\\");
}

function parseRow(value: unknown, imageUrl: string | undefined, scope: ExplorePhotoScope): ExplorePhoto | null {
  if (typeof value !== "object" || value === null || imageUrl === undefined) return null;
  const row = value as Record<string, unknown>;
  if (typeof row["id"] !== "string" || typeof row["owner_id"] !== "string" ||
    typeof row["created_at"] !== "string" || !Number.isInteger(row["liked"]) || Number(row["liked"]) < 0 ||
    typeof row["lat"] !== "number" || !Number.isFinite(row["lat"]) ||
    typeof row["lng"] !== "number" || !Number.isFinite(row["lng"]) ||
    !["hidden", "approximate", "exact"].includes(String(row["location_precision"])) ||
    (scope === "others" && !["approximate", "exact"].includes(String(row["location_precision"]))) ||
    !(typeof row["date"] === "string" || row["date"] === null) ||
    !(typeof row["description"] === "string" || row["description"] === null)) return null;
  try {
    if (!["http:", "https:"].includes(new URL(imageUrl).protocol)) return null;
  } catch {
    return null;
  }
  const visibility = ["private", "link", "public"].includes(String(row["visibility"]))
    ? row["visibility"] as "private" | "link" | "public"
    : scope === "others" ? "public" : null;
  if (visibility === null || (scope === "others" && visibility !== "public")) return null;
  return {
    id: row["id"], date: row["date"], description: row["description"], liked: Number(row["liked"]),
    ownerId: row["owner_id"], createdAt: row["created_at"], imageUrl,
    lat: row["lat"], lng: row["lng"],
    locationPrecision: row["location_precision"] as "hidden" | "approximate" | "exact",
    visibility
  };
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted === true) throw new DOMException("Aborted", "AbortError");
}

const defaultDependencies: ExploreRepositoryDependencies = {
  async fetchRows({ bounds, offset, limit, scope, viewerId, signal }) {
    const client = getSupabaseClient();
    if (scope === "mine" && viewerId !== null) {
      let locationQuery = client
        .from("photo_private_locations")
        .select("photo_id,lat,lng")
        .eq("owner_id", viewerId)
        .gte("lat", bounds.south)
        .lte("lat", bounds.north)
        .gte("lng", bounds.west)
        .lte("lng", bounds.east)
        .order("photo_id", { ascending: false })
        .range(offset, offset + limit - 1);
      if (signal !== undefined) locationQuery = locationQuery.abortSignal(signal);
      const { data: locations, error: locationError } = await locationQuery;
      if (locationError !== null || locations === null || locations.length === 0) {
        return { rows: locations === null ? null : [], error: locationError };
      }
      const photoIds = locations.map((location) => location.photo_id);
      let photoQuery = client
        .from("photos")
        .select(PHOTO_COLUMNS)
        .eq("owner_id", viewerId)
        .in("id", photoIds);
      if (signal !== undefined) photoQuery = photoQuery.abortSignal(signal);
      const { data: photos, error: photoError } = await photoQuery;
      if (photoError !== null || photos === null) return { rows: photos, error: photoError };
      const photoById = new Map(photos.map((photo) => [photo.id, photo]));
      return {
        rows: locations.map((location) => {
          const photo = photoById.get(location.photo_id);
          return photo === undefined ? null : { ...photo, lat: location.lat, lng: location.lng };
        }),
        error: null
      };
    }

    let query = client
      .from("photos")
      .select(PHOTO_COLUMNS)
      .eq("visibility", "public")
      .in("location_precision", ["approximate", "exact"])
      .gte("lat", bounds.south)
      .lte("lat", bounds.north)
      .gte("lng", bounds.west)
      .lte("lng", bounds.east)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);
    if (scope === "others" && viewerId !== null) query = query.neq("owner_id", viewerId);
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

const defaultOwnedBoundsDependencies: OwnedPhotoBoundsDependencies = {
  async fetchLocations(viewerId, signal) {
    let query = getSupabaseClient()
      .from("photo_private_locations")
      .select("lat,lng")
      .eq("owner_id", viewerId)
      .limit(5000);
    if (signal !== undefined) query = query.abortSignal(signal);
    const { data, error } = await query;
    return { rows: data, error };
  }
};

const defaultPublicBoundsDependencies: PublicPhotoBoundsDependencies = {
  async fetchLocations(signal) {
    let query = getSupabaseClient()
      .from("photos")
      .select("lat,lng")
      .eq("visibility", "public")
      .in("location_precision", ["approximate", "exact"])
      .limit(5000);
    if (signal !== undefined) query = query.abortSignal(signal);
    const { data, error } = await query;
    return { rows: data, error };
  }
};

function boundsFromLocationRows(rows: unknown, error: unknown): ExploreBounds | null {
  if (error !== null || !Array.isArray(rows)) throw new Error(GENERIC_EXPLORE_ERROR);
  const locations = rows.map((value) => {
    if (typeof value !== "object" || value === null) return null;
    const row = value as Record<string, unknown>;
    return typeof row["lat"] === "number" && Number.isFinite(row["lat"]) &&
      typeof row["lng"] === "number" && Number.isFinite(row["lng"])
      ? { lat: row["lat"], lng: row["lng"] }
      : null;
  });
  if (locations.some((location) => location === null)) throw new Error(GENERIC_EXPLORE_ERROR);
  if (locations.length === 0) return null;
  const points = locations as { readonly lat: number; readonly lng: number }[];
  const minLat = Math.min(...points.map((point) => point.lat));
  const maxLat = Math.max(...points.map((point) => point.lat));
  const minLng = Math.min(...points.map((point) => point.lng));
  const maxLng = Math.max(...points.map((point) => point.lng));
  const latPadding = Math.max(0.08, (maxLat - minLat) * 0.14);
  const lngPadding = Math.max(0.1, (maxLng - minLng) * 0.14);
  return {
    north: Math.min(90, maxLat + latPadding),
    south: Math.max(-90, minLat - latPadding),
    east: Math.min(180, maxLng + lngPadding),
    west: Math.max(-180, minLng - lngPadding)
  };
}

export async function fetchPublicPhotoBounds(
  signal?: AbortSignal,
  dependencies: PublicPhotoBoundsDependencies = defaultPublicBoundsDependencies
): Promise<ExploreBounds | null> {
  throwIfAborted(signal);
  const { rows, error } = await dependencies.fetchLocations(signal);
  throwIfAborted(signal);
  return boundsFromLocationRows(rows, error);
}

export async function fetchOwnedPhotoBounds(
  viewerId: string,
  signal?: AbortSignal,
  dependencies: OwnedPhotoBoundsDependencies = defaultOwnedBoundsDependencies
): Promise<ExploreBounds | null> {
  if (viewerId.trim().length === 0 || viewerId.length > 128) throw new Error(GENERIC_EXPLORE_ERROR);
  throwIfAborted(signal);
  const { rows, error } = await dependencies.fetchLocations(viewerId, signal);
  throwIfAborted(signal);
  return boundsFromLocationRows(rows, error);
}

export async function fetchExplorePhotoPage(
  input: {
    readonly bounds: ExploreBounds;
    readonly offset: number;
    readonly pageSize: number;
    readonly scope?: ExplorePhotoScope;
    readonly viewerId?: string | null;
    readonly signal?: AbortSignal;
  },
  dependencies: ExploreRepositoryDependencies = defaultDependencies
): Promise<ExplorePhotoPage> {
  const scope = input.scope ?? "others";
  const viewerId = typeof input.viewerId === "string" && input.viewerId.trim().length > 0 && input.viewerId.length <= 128
    ? input.viewerId : null;
  if (!Number.isInteger(input.offset) || input.offset < 0 || !Number.isInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > 50 ||
    !["others", "mine"].includes(scope) || (scope === "mine" && viewerId === null)) {
    throw new Error(GENERIC_EXPLORE_ERROR);
  }
  throwIfAborted(input.signal);
  const { rows, error } = await dependencies.fetchRows({
    bounds: input.bounds, offset: input.offset, limit: input.pageSize, scope, viewerId, signal: input.signal
  });
  if (error !== null || !Array.isArray(rows)) throw new Error(GENERIC_EXPLORE_ERROR);
  const paths = rows.map((row) => typeof row === "object" && row !== null
    ? (row as Record<string, unknown>)["storage_path"]
    : null);
  if (!paths.every(isSafeStoragePath)) throw new Error(GENERIC_EXPLORE_ERROR);
  if (paths.length === 0) return { photos: [], hasMore: false, nextOffset: input.offset };
  const { urls, error: signError } = await dependencies.signPaths(paths, 300, input.signal);
  if (signError !== null) throw new Error(GENERIC_EXPLORE_ERROR);
  const photos = rows.map((row, index) => {
    const path = paths[index];
    return typeof path === "string" ? parseRow(row, urls.get(path), scope) : null;
  });
  if (photos.some((photo) => photo === null)) throw new Error(GENERIC_EXPLORE_ERROR);
  return {
    photos: photos as ExplorePhoto[],
    hasMore: rows.length === input.pageSize,
    nextOffset: input.offset + rows.length
  };
}
