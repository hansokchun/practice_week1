import { boundsToRegion } from "./explore-map-viewport";
import type { ExploreBounds } from "./explore-photo-repository";

export type PlaceSearchResult = {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly viewport: ExploreBounds;
};

export interface NativePlaceSearchAdapter {
  readonly searchPlaces: (query: string, bias: ExploreBounds) => Promise<unknown>;
}

export type PlaceSearchErrorCode =
  | "invalid-query"
  | "unavailable"
  | "network"
  | "quota"
  | "configuration"
  | "failed";

export class PlaceSearchError extends Error {
  public constructor(public readonly code: PlaceSearchErrorCode) {
    super(code === "invalid-query" ? "검색어를 확인해 주세요."
      : code === "unavailable" ? "이 빌드에서는 장소 검색을 사용할 수 없어요."
        : code === "network" ? "인터넷 연결 후 장소를 다시 검색해 주세요."
          : code === "quota" ? "장소 검색 사용량이 잠시 초과됐어요."
            : code === "configuration" ? "장소 검색을 잠시 사용할 수 없어요."
              : "장소를 검색하지 못했어요.");
    this.name = "PlaceSearchError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

function derivedViewport(latitude: number, longitude: number): ExploreBounds {
  const latitudeRadius = 0.025;
  const longitudeRadius = 0.035;
  return {
    north: Math.min(90, latitude + latitudeRadius),
    south: Math.max(-90, latitude - latitudeRadius),
    east: Math.min(180, longitude + longitudeRadius),
    west: Math.max(-180, longitude - longitudeRadius)
  };
}

function parseViewport(value: unknown, latitude: number, longitude: number): ExploreBounds {
  const candidate = isRecord(value) ? {
    north: Number(value["north"]), south: Number(value["south"]),
    east: Number(value["east"]), west: Number(value["west"])
  } : derivedViewport(latitude, longitude);
  boundsToRegion(candidate);
  return candidate;
}

function parsePlace(value: unknown): PlaceSearchResult | null {
  if (!isRecord(value)) return null;
  const id = safeString(value["id"], 512);
  const name = safeString(value["name"], 120);
  const address = safeString(value["address"], 240);
  const latitude = value["latitude"];
  const longitude = value["longitude"];
  if (id === null || name === null || address === null || typeof latitude !== "number" ||
    typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  try {
    return { id, name, address, latitude, longitude, viewport: parseViewport(value["viewport"], latitude, longitude) };
  } catch {
    return null;
  }
}

export async function searchPlaces(
  query: string,
  bias: ExploreBounds,
  adapter: NativePlaceSearchAdapter
): Promise<readonly PlaceSearchResult[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 1 || normalizedQuery.length > 80) throw new PlaceSearchError("invalid-query");
  try {
    boundsToRegion(bias);
    const raw = await adapter.searchPlaces(normalizedQuery, bias);
    if (!Array.isArray(raw) || raw.length > 5) throw new PlaceSearchError("failed");
    const places = raw.map(parsePlace);
    if (places.some((place) => place === null)) throw new PlaceSearchError("failed");
    const parsed = places as PlaceSearchResult[];
    if (new Set(parsed.map((place) => place.id)).size !== parsed.length) throw new PlaceSearchError("failed");
    return parsed;
  } catch (error) {
    if (error instanceof PlaceSearchError) throw error;
    throw new PlaceSearchError("failed");
  }
}
