import { ExploreMapFallback } from "./ExploreMapFallback";
import type { ExploreMapSurfaceProps } from "./ExploreMapSurface.types";

export function ExploreMapSurface(props: ExploreMapSurfaceProps) {
  return <ExploreMapFallback {...props} />;
}

export default ExploreMapSurface;
