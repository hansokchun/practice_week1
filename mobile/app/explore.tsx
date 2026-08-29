import { ExploreScreen } from "./(tabs)/index";
import { useLocalSearchParams } from "expo-router";
import { useAuthSession } from "../src/auth-session";
import { useContentVisibilityRefreshKey } from "../src/content-visibility-refresh";

export default function ExploreRoute() {
  const params = useLocalSearchParams<{
    readonly focusPhotoId?: string | string[];
    readonly lat?: string | string[];
    readonly lng?: string | string[];
    readonly scope?: string | string[];
  }>();
  const refreshKey = useContentVisibilityRefreshKey();
  const auth = useAuthSession();
  const lat = typeof params.lat === "string" ? Number(params.lat) : Number.NaN;
  const lng = typeof params.lng === "string" ? Number(params.lng) : Number.NaN;
  const focusPhotoId = typeof params.focusPhotoId === "string" ? params.focusPhotoId : null;
  const requestedScope = params.scope === "mine" && auth.user?.id !== undefined ? "mine" : "others";
  const initialFocus = focusPhotoId !== null && Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ? { photoId: focusPhotoId, lat, lng, scope: requestedScope } as const
    : undefined;
  return <ExploreScreen {...(initialFocus === undefined ? {} : { initialFocus })} key={auth.user?.id ?? "guest"} refreshKey={refreshKey} viewerId={auth.user?.id ?? null} />;
}
