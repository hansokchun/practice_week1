import { getSupabaseClient } from "./supabase-client";

export type LandingPhoto = {
  readonly id: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly album: string | null;
  readonly ownerId: string;
  readonly createdAt: string;
  readonly date: string | null;
  readonly imageUrl: string;
  readonly locationPrecision: "hidden" | "approximate" | "exact";
  readonly lat: number | null;
  readonly lng: number | null;
};

export type LandingSection = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly photos: readonly LandingPhoto[];
};

export type LandingContent = { readonly sections: readonly LandingSection[] };

type LandingDependencies = {
  readonly fetchCuration: () => Promise<{
    readonly sections: unknown;
    readonly assignments: unknown;
    readonly error: unknown;
  }>;
  readonly fetchPhotos: (limit: number) => Promise<{ readonly rows: unknown; readonly error: unknown }>;
  readonly signPaths: (paths: readonly string[], expiresIn: number) => Promise<{
    readonly urls: ReadonlyMap<string, string>;
    readonly error: unknown;
  }>;
};

const GENERIC_LANDING_ERROR = "랜딩 사진을 불러오지 못했어요.";
const PHOTO_COLUMNS = "id,title,description,album,storage_path,owner_id,created_at,date,location_precision,lat,lng";
const DEFAULT_SECTIONS = ["추천", "한국", "일본", "풍경", "도시"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSafeStoragePath(value: unknown): value is string {
  return typeof value === "string" && value.length <= 1024 && value.includes("/") &&
    !value.startsWith("/") && !value.includes("..") && !value.includes("\\");
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" ? value : value === null ? null : null;
}

function parsePhoto(row: unknown, imageUrl: string | undefined): LandingPhoto | null {
  if (!isRecord(row) || typeof imageUrl !== "string") return null;
  if (typeof row["id"] !== "string" || typeof row["owner_id"] !== "string" ||
      typeof row["created_at"] !== "string" ||
      !["hidden", "approximate", "exact"].includes(String(row["location_precision"]))) return null;
  try {
    if (!["http:", "https:"].includes(new URL(imageUrl).protocol)) return null;
  } catch {
    return null;
  }
  const precision = row["location_precision"] as LandingPhoto["locationPrecision"];
  const hasPublicCoordinates = precision !== "hidden" && typeof row["lat"] === "number" &&
    Number.isFinite(row["lat"]) && typeof row["lng"] === "number" && Number.isFinite(row["lng"]);
  return {
    id: row["id"], title: nullableText(row["title"]), description: nullableText(row["description"]),
    album: nullableText(row["album"]), ownerId: row["owner_id"], createdAt: row["created_at"],
    date: nullableText(row["date"]), imageUrl, locationPrecision: precision,
    lat: hasPublicCoordinates ? row["lat"] as number : null,
    lng: hasPublicCoordinates ? row["lng"] as number : null
  };
}

function normalizeSearchText(value: string | null | undefined): string {
  return String(value ?? "").trim().toLocaleLowerCase("ko-KR");
}

export function filterLandingPhotos(photos: readonly LandingPhoto[], query: string): readonly LandingPhoto[] {
  const normalized = normalizeSearchText(query);
  if (normalized.length === 0) return photos;
  return photos.filter((photo) => [photo.title, photo.description, photo.album]
    .some((value) => normalizeSearchText(value).includes(normalized)));
}

const defaultDependencies: LandingDependencies = {
  async fetchCuration() {
    const client = getSupabaseClient();
    const [sections, assignments] = await Promise.all([
      client.from("landing_sections").select("id,title,description,sort_order,is_visible")
        .eq("is_visible", true).order("sort_order", { ascending: true }),
      client.from("landing_section_photos").select("section_id,photo_id,sort_order")
        .order("sort_order", { ascending: true })
    ]);
    return {
      sections: sections.data, assignments: assignments.data,
      error: sections.error ?? assignments.error
    };
  },
  async fetchPhotos(limit) {
    const { data, error } = await getSupabaseClient().from("photos").select(PHOTO_COLUMNS)
      .or("shared.eq.true,visibility.eq.public")
      .order("created_at", { ascending: false }).limit(limit);
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

export async function fetchLandingContent(
  dependencies: LandingDependencies = defaultDependencies
): Promise<LandingContent> {
  const results = await Promise.all([
    dependencies.fetchCuration(), dependencies.fetchPhotos(100)
  ]);
  if (!isRecord(results[0]) || !isRecord(results[1])) throw new Error(GENERIC_LANDING_ERROR);
  const { sections, assignments, error: curationError } = results[0];
  const { rows, error: photoError } = results[1];
  if (curationError !== null || photoError !== null || !Array.isArray(sections) ||
      !Array.isArray(assignments) || !Array.isArray(rows)) throw new Error(GENERIC_LANDING_ERROR);

  const paths = rows.map((row) => isRecord(row) ? row["storage_path"] : null);
  if (!paths.every(isSafeStoragePath)) throw new Error(GENERIC_LANDING_ERROR);
  const signed = paths.length === 0
    ? { urls: new Map<string, string>(), error: null }
    : await dependencies.signPaths(paths, 300);
  if (signed.error !== null) throw new Error(GENERIC_LANDING_ERROR);
  const photos = rows.map((row, index) => parsePhoto(row, signed.urls.get(paths[index] as string)));
  if (photos.some((photo) => photo === null)) throw new Error(GENERIC_LANDING_ERROR);
  const publicPhotos = photos as LandingPhoto[];

  const normalizedAssignments = assignments.filter(isRecord)
    .filter((item) => typeof item["section_id"] === "string" && typeof item["photo_id"] === "string")
    .sort((left, right) => Number(left["sort_order"] ?? 0) - Number(right["sort_order"] ?? 0));
  const normalizedSections = sections.filter(isRecord)
    .filter((section) => typeof section["id"] === "string" && typeof section["title"] === "string")
    .sort((left, right) => Number(left["sort_order"] ?? 0) - Number(right["sort_order"] ?? 0));
  const sourceSections = normalizedSections.length > 0 ? normalizedSections : DEFAULT_SECTIONS.map((title, index) => ({
    id: `default-${index}`, title, description: "", sort_order: index
  }));
  const photoById = new Map(publicPhotos.map((photo) => [photo.id, photo]));

  return {
    sections: sourceSections.map((section, sectionIndex) => {
      const assigned = normalizedAssignments
        .filter((item) => item["section_id"] === section["id"])
        .map((item) => photoById.get(item["photo_id"] as string))
        .filter((photo): photo is LandingPhoto => photo !== undefined);
      const fallback = publicPhotos.length === 0 ? [] : [
        ...publicPhotos.slice(sectionIndex % publicPhotos.length),
        ...publicPhotos.slice(0, sectionIndex % publicPhotos.length)
      ];
      return {
        id: section["id"] as string,
        title: (section["title"] as string).trim() || "여행 사진",
        description: typeof section["description"] === "string" ? section["description"].trim() : "",
        photos: assigned.length > 0 ? assigned : fallback
      };
    })
  };
}
