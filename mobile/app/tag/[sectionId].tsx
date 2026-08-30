import { router, useLocalSearchParams } from "expo-router";

import { LandingTagScreen } from "../../src/LandingTagScreen";
import { publicPhotoDetailRoute } from "../../src/mobile-routes";

export default function LandingTagRoute() {
  const params = useLocalSearchParams<{ sectionId?: string | string[] }>();
  const rawSectionId = Array.isArray(params.sectionId) ? params.sectionId[0] : params.sectionId;
  const sectionId = typeof rawSectionId === "string" ? decodeURIComponent(rawSectionId) : "";

  return (
    <LandingTagScreen
      goBack={() => router.back()}
      openPhoto={(photoId) => router.push({ pathname: publicPhotoDetailRoute, params: { photoId } })}
      sectionId={sectionId}
    />
  );
}
