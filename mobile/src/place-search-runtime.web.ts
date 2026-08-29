import type { ExploreBounds } from "./explore-photo-repository";
import { PlaceSearchError } from "./place-search";

export const placeSearchRuntime = {
  async search(_query: string, _bias: ExploreBounds): Promise<never> {
    throw new PlaceSearchError("unavailable");
  }
};
