import {
  createExploreMarkerClusters,
  getExploreClusterZoomBounds,
  getNextExploreClusterPhotoId
} from "../src/explore-marker-clusters";

const bounds = { north: 38, south: 37, east: 128, west: 127 };

describe("Explore marker clustering", () => {
  it("combines nearby photos while keeping distant photos separate", () => {
    const clusters = createExploreMarkerClusters([
      { id: "near-a", lat: 37.5, lng: 127.5 },
      { id: "near-b", lat: 37.51, lng: 127.51 },
      { id: "distant", lat: 37.8, lng: 127.8 }
    ], bounds);

    expect(clusters).toHaveLength(2);
    expect(clusters[0]?.photoIds).toEqual(["near-a", "near-b"]);
    expect(clusters[0]?.latitude).toBeCloseTo(37.505);
    expect(clusters[0]?.longitude).toBeCloseTo(127.505);
    expect(clusters[1]?.photoIds).toEqual(["distant"]);
  });

  it("checks adjacent grid cells so boundary-neighbor photos still cluster", () => {
    const clusters = createExploreMarkerClusters([
      { id: "left", lat: 37.5, lng: 127.049 },
      { id: "right", lat: 37.5, lng: 127.051 }
    ], bounds, 5);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.photoIds).toEqual(["left", "right"]);
  });

  it("keeps cluster and photo order stable and positions markers inside the canvas", () => {
    const clusters = createExploreMarkerClusters([
      { id: "second", lat: 37.2, lng: 127.2 },
      { id: "first", lat: 37.21, lng: 127.21 },
      { id: "outside", lat: 39, lng: 129 }
    ], bounds);

    expect(clusters.map((cluster) => cluster.photoIds)).toEqual([["second", "first"], ["outside"]]);
    for (const cluster of clusters) {
      expect(cluster.leftPercent).toBeGreaterThanOrEqual(8);
      expect(cluster.leftPercent).toBeLessThanOrEqual(92);
      expect(cluster.topPercent).toBeGreaterThanOrEqual(20);
      expect(cluster.topPercent).toBeLessThanOrEqual(74);
    }
  });

  it("cycles through every photo in a cluster and recovers stale selection", () => {
    const photoIds = ["photo-a", "photo-b", "photo-c"];

    expect(getNextExploreClusterPhotoId(photoIds, null)).toBe("photo-a");
    expect(getNextExploreClusterPhotoId(photoIds, "missing")).toBe("photo-a");
    expect(getNextExploreClusterPhotoId(photoIds, "photo-a")).toBe("photo-b");
    expect(getNextExploreClusterPhotoId(photoIds, "photo-c")).toBe("photo-a");
    expect(getNextExploreClusterPhotoId([], "photo-a")).toBeNull();
  });

  it("adds a small outer margin when zooming a cluster so its pins can separate", () => {
    const cluster = createExploreMarkerClusters([
      { id: "photo-a", lat: 37.5, lng: 127.0 },
      { id: "photo-b", lat: 37.501, lng: 127.001 }
    ], bounds)[0];

    expect(cluster).toBeDefined();
    const zoomBounds = getExploreClusterZoomBounds(cluster!);
    expect(zoomBounds.south).toBeLessThan(37.5);
    expect(zoomBounds.north).toBeGreaterThan(37.501);
    expect(zoomBounds.west).toBeLessThan(127.0);
    expect(zoomBounds.east).toBeGreaterThan(127.001);
  });
});
