export type DevicePhotoPlatform = "android" | "ios";

export type DevicePhotoMetadataAsset = {
  readonly getExif: () => Promise<Record<string, unknown>>;
  readonly getLocation: () => Promise<{ readonly latitude: number; readonly longitude: number } | null>;
  readonly getMediaSubtypes: () => Promise<readonly string[]>;
};

export type SafeDevicePhotoMetadata = {
  readonly mediaType: "photo" | "live_photo";
  readonly capturedAt: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly exifJson: string;
};

const SAFE_EXIF_KEYS = [
  "DateTimeOriginal",
  "DateTimeDigitized",
  "DateTime",
  "OffsetTimeOriginal",
  "Make",
  "Model",
  "LensModel",
  "FNumber",
  "ExposureTime",
  "ISOSpeedRatings",
  "FocalLength",
  "PixelXDimension",
  "PixelYDimension",
  "Orientation"
] as const;

function safeExifValue(key: string, value: unknown): string | number | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized === "" || normalized.length > 256) return null;
    if (
      (key === "DateTimeOriginal" || key === "DateTimeDigitized" || key === "DateTime") &&
      !/^\d{4}:\d{2}:\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(normalized)
    ) return null;
    if (key === "OffsetTimeOriginal" && !/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(normalized)) {
      return null;
    }
    return normalized;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (key === "Orientation" && (!Number.isInteger(value) || value < 1 || value > 8)) {
    return null;
  }
  return value;
}

function sanitizeExif(exif: Record<string, unknown>): Record<string, string | number> {
  const safe: Record<string, string | number> = {};
  for (const key of SAFE_EXIF_KEYS) {
    const value = safeExifValue(key, exif[key]);
    if (value !== null) safe[key] = value;
  }
  return safe;
}

function parseExifCaptureTime(exif: Record<string, string | number>): string | null {
  const candidate = [exif["DateTimeOriginal"], exif["DateTimeDigitized"], exif["DateTime"]]
    .find((value): value is string => typeof value === "string");
  if (candidate === undefined) return null;
  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(candidate);
  if (match === null) return null;
  const [, year, month, day, hour, minute, second] = match;
  const values = [year, month, day, hour, minute, second].map(Number);
  const [y, m, d, h, min, s] = values;
  if (
    y === undefined || m === undefined || d === undefined || h === undefined ||
    min === undefined || s === undefined || m < 1 || m > 12 || d < 1 || d > 31 ||
    h > 23 || min > 59 || s > 59
  ) return null;
  const probe = new Date(Date.UTC(y, m - 1, d, h, min, s));
  if (
    probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d || probe.getUTCHours() !== h ||
    probe.getUTCMinutes() !== min || probe.getUTCSeconds() !== s
  ) return null;
  const offset = exif["OffsetTimeOriginal"];
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${typeof offset === "string" ? offset : ""}`;
}

function safeCoordinates(
  location: { readonly latitude: number; readonly longitude: number } | null
): { readonly latitude: number | null; readonly longitude: number | null } {
  if (
    location === null || !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) || location.latitude < -90 ||
    location.latitude > 90 || location.longitude < -180 || location.longitude > 180
  ) return { latitude: null, longitude: null };
  return { latitude: location.latitude, longitude: location.longitude };
}

async function settle<T>(task: () => Promise<T>): Promise<
  { readonly ok: true; readonly value: T } | { readonly ok: false }
> {
  try {
    return { ok: true, value: await task() };
  } catch (cause) {
    void cause;
    return { ok: false };
  }
}

export async function readSafeDevicePhotoMetadata(
  asset: DevicePhotoMetadataAsset,
  platform: DevicePhotoPlatform
): Promise<SafeDevicePhotoMetadata> {
  const [exifResult, locationResult, subtypeResult] = await Promise.all([
    settle(() => asset.getExif()),
    settle(() => asset.getLocation()),
    platform === "ios" ? settle(() => asset.getMediaSubtypes()) : Promise.resolve({ ok: true as const, value: [] })
  ]);
  const allUnavailable = !exifResult.ok && !locationResult.ok &&
    (platform === "android" || !subtypeResult.ok);
  const exif = sanitizeExif(exifResult.ok ? exifResult.value : {});
  const coordinates = safeCoordinates(locationResult.ok ? locationResult.value : null);
  const mediaType = subtypeResult.ok && subtypeResult.value.includes("livePhoto")
    ? "live_photo"
    : "photo";

  return {
    mediaType,
    capturedAt: parseExifCaptureTime(exif),
    ...coordinates,
    exifJson: allUnavailable ? '{"status":"unavailable"}' : JSON.stringify(exif)
  };
}
