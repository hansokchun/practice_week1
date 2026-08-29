import { requireNativeModule } from "expo";

import type { ExploreBounds } from "./explore-photo-repository";
import { PlaceSearchError, searchPlaces, type NativePlaceSearchAdapter } from "./place-search";

type IkkyeePlaceSearchModule = {
  readonly searchPlaces: (
    query: string,
    north: number,
    south: number,
    east: number,
    west: number
  ) => Promise<unknown>;
};

function loadNativeModule(): IkkyeePlaceSearchModule {
  return requireNativeModule<IkkyeePlaceSearchModule>("IkkyeePlaceSearch");
}

export function createNativePlaceSearchAdapter(
  loadModule: () => IkkyeePlaceSearchModule = loadNativeModule
): NativePlaceSearchAdapter {
  return {
    async searchPlaces(query, bias) {
      let nativeModule: IkkyeePlaceSearchModule;
      try {
        nativeModule = loadModule();
      } catch {
        throw new PlaceSearchError("unavailable");
      }
      try {
        return await nativeModule.searchPlaces(query, bias.north, bias.south, bias.east, bias.west);
      } catch (error) {
        const nativeCode = typeof error === "object" && error !== null
          ? (error as { readonly code?: unknown }).code : null;
        const mappedCode = nativeCode === "E_PLACE_SEARCH_UNAVAILABLE" ? "unavailable"
          : nativeCode === "E_PLACE_SEARCH_NETWORK" ? "network"
            : nativeCode === "E_PLACE_SEARCH_QUOTA" ? "quota"
              : nativeCode === "E_PLACE_SEARCH_CONFIGURATION" ? "configuration"
                : null;
        if (mappedCode !== null) {
          throw new PlaceSearchError(mappedCode);
        }
        throw error;
      }
    }
  };
}

const nativeAdapter = createNativePlaceSearchAdapter();

export const placeSearchRuntime = {
  search(query: string, bias: ExploreBounds) {
    return searchPlaces(query, bias, nativeAdapter);
  }
};
