import { searchPlaces, type NativePlaceSearchAdapter } from "../src/place-search";
import { SEOUL_EXPLORE_BOUNDS } from "../src/explore-photo-repository";

describe("native place search boundary", () => {
  it("trims a bounded query and accepts only a minimal safe place projection", async () => {
    const adapter: NativePlaceSearchAdapter = {
      searchPlaces: jest.fn(async () => [{
        id: "place-busan-station",
        name: "부산역",
        address: "부산 동구",
        latitude: 35.1151,
        longitude: 129.0414,
        viewport: { north: 35.13, south: 35.1, east: 129.06, west: 129.02 }
      }])
    };

    await expect(searchPlaces("  부산역  ", SEOUL_EXPLORE_BOUNDS, adapter)).resolves.toEqual([{
      id: "place-busan-station",
      name: "부산역",
      address: "부산 동구",
      latitude: 35.1151,
      longitude: 129.0414,
      viewport: { north: 35.13, south: 35.1, east: 129.06, west: 129.02 }
    }]);
    expect(adapter.searchPlaces).toHaveBeenCalledWith("부산역", SEOUL_EXPLORE_BOUNDS);
  });

  it("rejects malformed queries and unsafe native results without exposing provider details", async () => {
    const adapter: NativePlaceSearchAdapter = {
      searchPlaces: async () => [{ id: "bad", name: "bad", address: "", latitude: 91, longitude: 0 }]
    };

    await expect(searchPlaces(" ", SEOUL_EXPLORE_BOUNDS, adapter)).rejects.toMatchObject({ code: "invalid-query" });
    await expect(searchPlaces("bad", SEOUL_EXPLORE_BOUNDS, adapter)).rejects.toMatchObject({ code: "failed" });
    await expect(searchPlaces("x".repeat(81), SEOUL_EXPLORE_BOUNDS, adapter)).rejects.toMatchObject({ code: "invalid-query" });
  });

  it("limits native results to five unique places", async () => {
    const adapter: NativePlaceSearchAdapter = {
      searchPlaces: async () => Array.from({ length: 6 }, (_, index) => ({
        id: `place-${index}`,
        name: `place ${index}`,
        address: "Seoul",
        latitude: 37.5,
        longitude: 127
      }))
    };

    await expect(searchPlaces("Seoul", SEOUL_EXPLORE_BOUNDS, adapter)).rejects.toMatchObject({ code: "failed" });
  });
});
