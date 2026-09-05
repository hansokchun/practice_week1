import type { LandingPhoto, LandingSection } from "./landing-photo-repository";

export const LANDING_TAG_INITIAL_COUNT = 20;
export const LANDING_TAG_LOAD_COUNT = 20;

const REGION_LABELS = [
  "서울", "부산", "제주", "인천", "대구", "대전", "광주", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남",
  "한국", "일본", "중국", "대만", "태국", "베트남", "프랑스", "스위스", "모로코",
  "아시아", "유럽", "북아메리카", "남아메리카", "아프리카", "오세아니아"
] as const;

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase("ko-KR");
}

function photoSearchText(photo: LandingPhoto): string {
  return [photo.title, photo.description, photo.album, photo.aiSummary, photo.aiScene,
    ...(photo.aiTags ?? []), ...(photo.aiMoods ?? [])]
    .map(normalize).filter(Boolean).join(" ");
}

export function buildLandingTagFeed(section: LandingSection, seed: string): readonly LandingPhoto[] {
  void seed;
  const photoById = new Map(section.photos.map((photo) => [photo.id, photo]));
  const curatedIds = [...new Set(section.curatedPhotoIds ?? [])]
    .filter((id) => photoById.has(id));
  return curatedIds.map((id) => photoById.get(id)).filter((photo): photo is LandingPhoto => photo !== undefined);
}

export function getLandingPhotoRegion(photo: LandingPhoto): string {
  const text = photoSearchText(photo);
  return REGION_LABELS.find((label) => text.includes(normalize(label))) ?? "";
}

export function getLandingTagRegions(photos: readonly LandingPhoto[]): readonly { readonly label: string; readonly count: number }[] {
  const counts = new Map<string, number>();
  for (const photo of photos) {
    const label = getLandingPhotoRegion(photo);
    if (label.length > 0) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }))
    .sort((left, right) => left.label.localeCompare(right.label, "ko-KR"));
}

export function filterLandingTagPhotosByRegion(
  photos: readonly LandingPhoto[],
  region: string
): readonly LandingPhoto[] {
  const normalized = region.trim();
  return normalized.length === 0 ? photos : photos.filter((photo) => getLandingPhotoRegion(photo) === normalized);
}
