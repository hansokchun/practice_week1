export type PrivateDevicePhotoLocation = {
  readonly latitude: number;
  readonly longitude: number;
};

type OptionalLocation = {
  readonly latitude?: number | null;
  readonly longitude?: number | null;
};

type MapPressInput = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

const PRIVATE_MAP_BOUNDS = {
  minimumLatitude: -85,
  maximumLatitude: 85,
  minimumLongitude: -180,
  maximumLongitude: 180
} as const;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function isValidPrivateDevicePhotoLocation(
  location: PrivateDevicePhotoLocation
): boolean {
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude) &&
    location.latitude >= -90 && location.latitude <= 90 &&
    location.longitude >= -180 && location.longitude <= 180;
}

export function isDevicePhotoLocationMissing(photo: OptionalLocation): boolean {
  return typeof photo.latitude !== "number" || !Number.isFinite(photo.latitude) ||
    typeof photo.longitude !== "number" || !Number.isFinite(photo.longitude);
}

export function getPrivateLocationFromMapPress(input: MapPressInput): PrivateDevicePhotoLocation {
  const width = Number.isFinite(input.width) && input.width > 0 ? input.width : 1;
  const height = Number.isFinite(input.height) && input.height > 0 ? input.height : 1;
  const xRatio = clamp(input.x / width, 0, 1);
  const yRatio = clamp(input.y / height, 0, 1);
  return {
    latitude: roundCoordinate(
      PRIVATE_MAP_BOUNDS.maximumLatitude -
      yRatio * (PRIVATE_MAP_BOUNDS.maximumLatitude - PRIVATE_MAP_BOUNDS.minimumLatitude)
    ),
    longitude: roundCoordinate(
      PRIVATE_MAP_BOUNDS.minimumLongitude +
      xRatio * (PRIVATE_MAP_BOUNDS.maximumLongitude - PRIVATE_MAP_BOUNDS.minimumLongitude)
    )
  };
}

export function getPrivateMapPosition(location: PrivateDevicePhotoLocation): {
  readonly leftPercent: number;
  readonly topPercent: number;
} {
  return {
    leftPercent: clamp(
      ((location.longitude - PRIVATE_MAP_BOUNDS.minimumLongitude) /
      (PRIVATE_MAP_BOUNDS.maximumLongitude - PRIVATE_MAP_BOUNDS.minimumLongitude)) * 100,
      0,
      100
    ),
    topPercent: clamp(
      ((PRIVATE_MAP_BOUNDS.maximumLatitude - location.latitude) /
      (PRIVATE_MAP_BOUNDS.maximumLatitude - PRIVATE_MAP_BOUNDS.minimumLatitude)) * 100,
      0,
      100
    )
  };
}
