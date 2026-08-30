import { router } from "expo-router";

import { useAuthSession } from "../src/auth-session";
import { MyAlbumsScreen } from "../src/MyAlbumsScreen";
import { albumDetailRoute, myPhotosRoute } from "../src/mobile-routes";

export default function AlbumsRoute() {
  const auth = useAuthSession();
  return (
    <MyAlbumsScreen
      goToPhotos={() => router.replace(myPhotosRoute)}
      openAlbum={(albumId) => router.push({ pathname: albumDetailRoute, params: { albumId } })}
      ownerId={auth.user?.id ?? null}
    />
  );
}
