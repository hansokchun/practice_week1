import Constants from "expo-constants";
import * as Linking from "expo-linking";

import { useContentVisibilityRefreshKey } from "../../src/content-visibility-refresh";
import type { LinkedPhoto } from "../../src/photo-link-client";
import { extractMobilePhotoShareToken } from "../../src/publication-link-token";
import { PhotoLinkScreen } from "./[token]";

type UniversalPhotoLinkScreenProps = {
  readonly currentUrl: string | null;
  readonly loadPhoto?: (token: string) => Promise<LinkedPhoto>;
  readonly publicOrigin: unknown;
  readonly refreshKey?: number;
};

export function UniversalPhotoLinkScreen({
  currentUrl,
  loadPhoto,
  publicOrigin,
  refreshKey = 0
}: UniversalPhotoLinkScreenProps) {
  const token = extractMobilePhotoShareToken(currentUrl, publicOrigin);
  return <PhotoLinkScreen {...(loadPhoto === undefined ? {} : { loadPhoto })} refreshKey={refreshKey} token={token} />;
}

export default function UniversalPhotoLinkRoute() {
  const currentUrl = Linking.useURL();
  const publicOrigin = Constants.expoConfig?.extra?.["publicLinkOrigin"];
  const refreshKey = useContentVisibilityRefreshKey();
  return <UniversalPhotoLinkScreen currentUrl={currentUrl} publicOrigin={publicOrigin} refreshKey={refreshKey} />;
}
