import { useRef } from "react";
import Constants from "expo-constants";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";

import { boundsToRegion, regionToBounds } from "./explore-map-viewport";
import { getExploreClusterZoomBounds } from "./explore-marker-clusters";
import { ExploreMapFallback } from "./ExploreMapFallback";
import type { ExploreMapSurfaceProps } from "./ExploreMapSurface.types";
import { mobileColors } from "./mobile-theme";

export function ExploreMapSurface({ bounds, clusters, nativeMapsEnabled, onBoundsChange, onClusterPress, photoKind = "public", selectedPhotoId }: ExploreMapSurfaceProps) {
  const mapRef = useRef<MapView>(null);
  const enabled = nativeMapsEnabled ?? (Constants.expoConfig?.extra?.["nativeMapsEnabled"] === true);
  function completeRegionChange(region: Region): void {
    try {
      onBoundsChange(regionToBounds(region));
    } catch {
      // Native providers can briefly report an incomplete camera while mounting.
    }
  }

  if (!enabled) {
    return <ExploreMapFallback bounds={bounds} clusters={clusters} onBoundsChange={onBoundsChange} onClusterPress={onClusterPress} photoKind={photoKind} selectedPhotoId={selectedPhotoId} />;
  }

  return (
    <MapView
      onRegionChangeComplete={completeRegionChange}
      provider={PROVIDER_GOOGLE}
      ref={mapRef}
      region={boundsToRegion(bounds)}
      rotateEnabled={false}
      style={StyleSheet.absoluteFill}
      testID="native-explore-map"
    >
      {clusters.map((cluster, index) => {
        const selected = selectedPhotoId !== null && cluster.photoIds.includes(selectedPhotoId);
        const prefix = photoKind === "owned" ? "내 사진" : "공개 사진";
        const label = cluster.photoIds.length > 1 ? `${prefix} ${cluster.photoIds.length}장 모음` : `${prefix} 위치 ${index + 1}`;
        return (
          <Marker
            accessibilityLabel={label}
            accessibilityRole="button"
            accessible
            coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
            identifier={cluster.id}
            key={`${cluster.id}:${selected ? "selected" : "idle"}`}
            onPress={() => {
              if (cluster.photoIds.length > 1) {
                mapRef.current?.animateToRegion(boundsToRegion(getExploreClusterZoomBounds(cluster)), 380);
              }
              onClusterPress(cluster.photoIds);
            }}
            tracksViewChanges={false}
          >
            <View style={[styles.marker, cluster.photoIds.length > 1 && styles.clusterMarker, selected && styles.selectedMarker]}>
              <Text style={[styles.markerText, selected && styles.selectedMarkerText]}>{cluster.photoIds.length}</Text>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

export default ExploreMapSurface;

const styles = StyleSheet.create({
  marker: {
    alignItems: "center",
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.pineDeep,
    borderRadius: 22,
    borderWidth: 3,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  clusterMarker: { backgroundColor: "#c9a050" },
  selectedMarker: { backgroundColor: "#f48c71", borderColor: mobileColors.surface, transform: [{ scale: 1.12 }] },
  markerText: { color: mobileColors.pineDeep, fontSize: 13, fontWeight: "800" },
  selectedMarkerText: { color: mobileColors.ink }
});
