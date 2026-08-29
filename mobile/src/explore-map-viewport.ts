import type { ExploreBounds } from "./explore-photo-repository";

export type ExploreRegion = {
  readonly latitude: number;
  readonly longitude: number;
  readonly latitudeDelta: number;
  readonly longitudeDelta: number;
};

const VIEWPORT_EPSILON = 0.00001;

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function assertValidBounds(bounds: ExploreBounds): void {
  if (![bounds.north, bounds.south, bounds.east, bounds.west].every(isFiniteNumber) ||
    bounds.north <= bounds.south || bounds.east <= bounds.west ||
    bounds.north > 90 || bounds.south < -90 || bounds.east > 180 || bounds.west < -180) {
    throw new TypeError("Explore viewport is invalid");
  }
}

export function boundsToRegion(bounds: ExploreBounds): ExploreRegion {
  assertValidBounds(bounds);
  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.east + bounds.west) / 2,
    latitudeDelta: bounds.north - bounds.south,
    longitudeDelta: bounds.east - bounds.west
  };
}

export function regionToBounds(region: ExploreRegion): ExploreBounds {
  if (![region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta].every(isFiniteNumber) ||
    region.latitude < -90 || region.latitude > 90 || region.longitude < -180 || region.longitude > 180 ||
    region.latitudeDelta <= 0 || region.latitudeDelta > 180 ||
    region.longitudeDelta <= 0 || region.longitudeDelta > 360) {
    throw new TypeError("Explore viewport is invalid");
  }
  const bounds = {
    north: region.latitude + region.latitudeDelta / 2,
    south: region.latitude - region.latitudeDelta / 2,
    east: region.longitude + region.longitudeDelta / 2,
    west: region.longitude - region.longitudeDelta / 2
  };
  assertValidBounds(bounds);
  return bounds;
}

export function areExploreBoundsEquivalent(left: ExploreBounds, right: ExploreBounds): boolean {
  return Math.abs(left.north - right.north) <= VIEWPORT_EPSILON &&
    Math.abs(left.south - right.south) <= VIEWPORT_EPSILON &&
    Math.abs(left.east - right.east) <= VIEWPORT_EPSILON &&
    Math.abs(left.west - right.west) <= VIEWPORT_EPSILON;
}
