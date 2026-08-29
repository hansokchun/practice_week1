import { createPrivatePhotoMapMarkers } from "../src/private-photo-map";

describe("private local photo map", () => {
  it("plots only valid private coordinates without returning raw coordinate labels", () => {
    const markers = createPrivatePhotoMapMarkers([
      { id: "jeju", filename: null, width: 1, height: 1, creationTime: 3, latitude: 33.4996, longitude: 126.5312 },
      { id: "seoul", filename: null, width: 1, height: 1, creationTime: 2, latitude: 37.5665, longitude: 126.978 },
      { id: "missing", filename: null, width: 1, height: 1, creationTime: 1, latitude: null, longitude: null },
      { id: "invalid", filename: null, width: 1, height: 1, creationTime: 0, latitude: 91, longitude: 181 }
    ]);

    expect(markers).toHaveLength(2);
    expect(markers.map(({ id }) => id)).toEqual(["jeju", "seoul"]);
    for (const marker of markers) {
      expect(marker.leftPercent).toBeGreaterThanOrEqual(10);
      expect(marker.leftPercent).toBeLessThanOrEqual(90);
      expect(marker.topPercent).toBeGreaterThanOrEqual(10);
      expect(marker.topPercent).toBeLessThanOrEqual(90);
      expect(JSON.stringify(marker)).not.toMatch(/33\.4996|37\.5665|126\.5312|126\.978/);
    }
  });

  it("centers photos captured at one location", () => {
    expect(createPrivatePhotoMapMarkers([
      { id: "one", filename: null, width: null, height: null, creationTime: null, latitude: 35, longitude: 128 }
    ])).toEqual([{ id: "one", label: "1", leftPercent: 50, topPercent: 50 }]);
  });
});
