import { createNativePlaceSearchAdapter } from "../src/place-search-runtime";
import { SEOUL_EXPLORE_BOUNDS } from "../src/explore-photo-repository";
import { PlaceSearchError } from "../src/place-search";

describe("native place search runtime", () => {
  it("loads the local Expo module lazily and sends only query plus viewport numbers", async () => {
    const searchPlaces = jest.fn(async () => []);
    const loadModule = jest.fn(() => ({ searchPlaces }));
    const adapter = createNativePlaceSearchAdapter(loadModule);

    expect(loadModule).not.toHaveBeenCalled();
    await expect(adapter.searchPlaces("부산역", SEOUL_EXPLORE_BOUNDS)).resolves.toEqual([]);
    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(searchPlaces).toHaveBeenCalledWith("부산역", 37.72, 37.42, 127.18, 126.76);
  });

  it("maps a missing module or native key to the safe unavailable state", async () => {
    const missingModule = createNativePlaceSearchAdapter(() => { throw new Error("native module detail"); });
    const missingKey = createNativePlaceSearchAdapter(() => ({
      searchPlaces: async () => { throw { code: "E_PLACE_SEARCH_UNAVAILABLE", message: "provider detail" }; }
    }));

    await expect(missingModule.searchPlaces("부산역", SEOUL_EXPLORE_BOUNDS)).rejects.toEqual(new PlaceSearchError("unavailable"));
    await expect(missingKey.searchPlaces("부산역", SEOUL_EXPLORE_BOUNDS)).rejects.toEqual(new PlaceSearchError("unavailable"));
  });

  it.each([
    ["E_PLACE_SEARCH_NETWORK", "network"],
    ["E_PLACE_SEARCH_QUOTA", "quota"],
    ["E_PLACE_SEARCH_CONFIGURATION", "configuration"]
  ] as const)("normalizes %s without exposing provider details", async (nativeCode, expectedCode) => {
    const adapter = createNativePlaceSearchAdapter(() => ({
      searchPlaces: async () => { throw { code: nativeCode, message: "provider secret detail" }; }
    }));

    await expect(adapter.searchPlaces("부산역", SEOUL_EXPLORE_BOUNDS)).rejects.toEqual(new PlaceSearchError(expectedCode));
  });
});
