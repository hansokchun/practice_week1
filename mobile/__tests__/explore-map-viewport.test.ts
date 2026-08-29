import {
  areExploreBoundsEquivalent,
  boundsToRegion,
  regionToBounds
} from "../src/explore-map-viewport";

describe("Explore native map viewport", () => {
  it("round-trips valid viewport bounds without exposing a different area", () => {
    const bounds = { north: 37.72, south: 37.42, east: 127.18, west: 126.76 };
    const roundTrip = regionToBounds(boundsToRegion(bounds));

    expect(roundTrip.north).toBeCloseTo(bounds.north, 8);
    expect(roundTrip.south).toBeCloseTo(bounds.south, 8);
    expect(roundTrip.east).toBeCloseTo(bounds.east, 8);
    expect(roundTrip.west).toBeCloseTo(bounds.west, 8);
  });

  it("rejects invalid or degenerate camera regions", () => {
    expect(() => regionToBounds({ latitude: 37.5, longitude: 127, latitudeDelta: 0, longitudeDelta: 0.1 })).toThrow("viewport");
    expect(() => regionToBounds({ latitude: 95, longitude: 127, latitudeDelta: 0.1, longitudeDelta: 0.1 })).toThrow("viewport");
    expect(() => boundsToRegion({ north: 37, south: 38, east: 128, west: 127 })).toThrow("viewport");
  });

  it("ignores camera completion jitter but detects an actual pan", () => {
    const current = { north: 37.72, south: 37.42, east: 127.18, west: 126.76 };
    expect(areExploreBoundsEquivalent(current, { ...current, north: current.north + 0.000001 })).toBe(true);
    expect(areExploreBoundsEquivalent(current, { ...current, north: current.north + 0.01 })).toBe(false);
  });
});
