import type { ComponentType } from "react";

import type { ExploreMarkerCluster } from "./explore-marker-clusters";
import type { ExploreBounds } from "./explore-photo-repository";

export type ExploreMapSurfaceProps = {
  readonly bounds: ExploreBounds;
  readonly clusters: readonly ExploreMarkerCluster[];
  readonly onBoundsChange: (bounds: ExploreBounds) => void;
  readonly onClusterPress: (photoIds: readonly string[]) => void;
  readonly selectedPhotoId: string | null;
  readonly nativeMapsEnabled?: boolean;
  readonly photoKind?: "owned" | "public";
};

export type ExploreMapSurfaceComponent = ComponentType<ExploreMapSurfaceProps>;
