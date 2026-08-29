import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ExploreMapSurfaceProps } from "./ExploreMapSurface.types";
import { getExploreClusterZoomBounds } from "./explore-marker-clusters";

export function ExploreMapFallback({ clusters, onBoundsChange, onClusterPress, photoKind = "public", selectedPhotoId }: ExploreMapSurfaceProps) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.mapSurface]} testID="explore-map-fallback">
      <View style={styles.landTop} />
      <View style={styles.landBottom} />
      {clusters.map((cluster, index) => {
        const selected = selectedPhotoId !== null && cluster.photoIds.includes(selectedPhotoId);
        return (
          <Pressable
            accessibilityLabel={cluster.photoIds.length > 1
              ? `${photoKind === "owned" ? "내 사진" : "공개 사진"} ${cluster.photoIds.length}장 모음`
              : `${photoKind === "owned" ? "내 사진" : "공개 사진"} 위치 ${index + 1}`}
            accessibilityRole="button"
            key={cluster.id}
            onPress={() => {
              if (cluster.photoIds.length > 1) onBoundsChange(getExploreClusterZoomBounds(cluster));
              onClusterPress(cluster.photoIds);
            }}
            style={[
              styles.marker,
              { left: `${cluster.leftPercent}%`, top: `${cluster.topPercent}%` },
              cluster.photoIds.length > 1 && styles.clusterMarker,
              selected && styles.selectedMarker
            ]}
          >
            <Text style={[styles.markerText, selected && styles.selectedMarkerText]}>{cluster.photoIds.length}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  mapSurface: { pointerEvents: "box-none" },
  landTop: { backgroundColor: "#e1eadb", borderBottomRightRadius: 80, height: "32%", left: 0, position: "absolute", right: "18%", top: 0 },
  landBottom: { backgroundColor: "#e1eadb", borderTopLeftRadius: 72, bottom: 0, height: "32%", left: "28%", position: "absolute", right: 0 },
  marker: { alignItems: "center", backgroundColor: "#fff", borderColor: "#003637", borderRadius: 22, borderWidth: 3, height: 44, justifyContent: "center", marginLeft: -22, marginTop: -22, position: "absolute", width: 44 },
  clusterMarker: { backgroundColor: "#c9a050" },
  selectedMarker: { backgroundColor: "#f48c71", borderColor: "#fff", transform: [{ scale: 1.12 }], zIndex: 2 },
  markerText: { color: "#003637", fontSize: 13, fontWeight: "800" },
  selectedMarkerText: { color: "#191c1c" }
});
