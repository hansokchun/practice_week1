import { router, useLocalSearchParams } from "expo-router";

import { AlbumDetailScreen } from "../../src/AlbumDetailScreen";
import { useAuthSession } from "../../src/auth-session";
import { publicPhotoDetailRoute } from "../../src/mobile-routes";

export default function AlbumDetailRoute() {
  const auth = useAuthSession();
  const params = useLocalSearchParams<{ albumId?: string | string[] }>();
  const albumId = Array.isArray(params.albumId) ? params.albumId[0] ?? "" : params.albumId ?? "";
  return (
    <AlbumDetailScreen
      albumId={albumId}
      goBack={() => router.back()}
      openPhoto={(photoId) => router.push({ pathname: publicPhotoDetailRoute, params: { photoId } })}
      ownerId={auth.user?.id ?? null}
    />
  );
}
