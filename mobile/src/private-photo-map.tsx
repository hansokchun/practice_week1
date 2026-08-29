import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DevicePhotoPreview } from "./device-photo-library";
import { mobileColors } from "./mobile-theme";

export type PrivatePhotoMapMarker = {
  readonly id: string;
  readonly label: string;
  readonly leftPercent: number;
  readonly topPercent: number;
};

type LocatedPhoto = DevicePhotoPreview & {
  readonly latitude: number;
  readonly longitude: number;
};

const MAP_PADDING_PERCENT = 10;
const MAP_SPAN_PERCENT = 80;

function isLocatedPhoto(photo: DevicePhotoPreview): photo is LocatedPhoto {
  return typeof photo.latitude === "number" && Number.isFinite(photo.latitude) &&
    photo.latitude >= -90 && photo.latitude <= 90 &&
    typeof photo.longitude === "number" && Number.isFinite(photo.longitude) &&
    photo.longitude >= -180 && photo.longitude <= 180;
}

function project(value: number, minimum: number, maximum: number): number {
  if (minimum === maximum) return 50;
  return MAP_PADDING_PERCENT + ((value - minimum) / (maximum - minimum)) * MAP_SPAN_PERCENT;
}

export function createPrivatePhotoMapMarkers(
  photos: readonly DevicePhotoPreview[]
): readonly PrivatePhotoMapMarker[] {
  const located = photos.filter(isLocatedPhoto);
  if (located.length === 0) return [];
  const latitudes = located.map(({ latitude }) => latitude);
  const longitudes = located.map(({ longitude }) => longitude);
  const minimumLatitude = Math.min(...latitudes);
  const maximumLatitude = Math.max(...latitudes);
  const minimumLongitude = Math.min(...longitudes);
  const maximumLongitude = Math.max(...longitudes);

  return located.map((photo, index) => ({
    id: photo.id,
    label: String(index + 1),
    leftPercent: project(photo.longitude, minimumLongitude, maximumLongitude),
    topPercent: 100 - project(photo.latitude, minimumLatitude, maximumLatitude)
  }));
}

export function PrivatePhotoMap({
  onSelectPhoto,
  photos
}: {
  readonly onSelectPhoto?: (assetId: string) => void;
  readonly photos: readonly DevicePhotoPreview[];
}) {
  const markers = createPrivatePhotoMapMarkers(photos);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.title}>비공개 로컬 지도</Text>
          <Text style={styles.count}>위치가 있는 사진 {markers.length}장</Text>
        </View>
        <Text style={styles.privateBadge}>기기 전용</Text>
      </View>
      {markers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>위치가 기록된 사진이 없어요</Text>
          <Text style={styles.emptyCopy}>사진의 위치 정보가 있으면 기기 안에서만 지도에 표시합니다.</Text>
        </View>
      ) : (
        <View accessibilityLabel="비공개 로컬 지도" style={styles.map}>
          <View style={styles.landNorth} />
          <View style={styles.landSouth} />
          <View style={[styles.gridLine, styles.gridVertical]} />
          <View style={[styles.gridLine, styles.gridHorizontal]} />
          {markers.map((marker) => (
            <Pressable
              accessibilityLabel={`기기 사진 위치 ${marker.label}`}
              accessibilityRole="button"
              key={marker.id}
              onPress={() => {
                setSelectedId(marker.id);
                onSelectPhoto?.(marker.id);
              }}
              style={[
                styles.marker,
                selectedId === marker.id && styles.markerSelected,
                { left: `${marker.leftPercent}%`, top: `${marker.topPercent}%` }
              ]}
            >
              <Text style={styles.markerText}>{marker.label}</Text>
            </Pressable>
          ))}
          <View style={styles.privacyNotice}>
            <Text style={styles.privacyTitle}>{selectedId === null ? "사진 위치는 공개되지 않아요" : "사진 위치를 선택했어요"}</Text>
            <Text style={styles.privacyCopy}>이 지도는 로컬 SQLite의 위치만 사용하며 외부 지도 서버로 전송하지 않습니다.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 24, paddingHorizontal: 16 },
  headingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  title: { color: mobileColors.ink, fontSize: 18, fontWeight: "800" },
  count: { color: mobileColors.muted, fontSize: 13, marginTop: 3 },
  privateBadge: { backgroundColor: "#e1eadb", borderRadius: 999, color: mobileColors.pineDeep, fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  empty: { alignItems: "center", backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 280, padding: 24 },
  emptyTitle: { color: mobileColors.ink, fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyCopy: { color: mobileColors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" },
  map: { backgroundColor: "#9ed8e2", borderRadius: 8, flex: 1, minHeight: 360, overflow: "hidden", position: "relative" },
  landNorth: { backgroundColor: "#e1eadb", borderBottomRightRadius: 72, height: "35%", left: 0, position: "absolute", right: "24%", top: 0 },
  landSouth: { backgroundColor: "#e1eadb", borderTopLeftRadius: 64, bottom: 0, height: "31%", left: "31%", position: "absolute", right: 0 },
  gridLine: { backgroundColor: "rgba(0, 54, 55, 0.08)", position: "absolute" },
  gridVertical: { bottom: 0, left: "50%", top: 0, width: 1 },
  gridHorizontal: { height: 1, left: 0, right: 0, top: "50%" },
  marker: { alignItems: "center", backgroundColor: "#f48c71", borderColor: mobileColors.surface, borderRadius: 22, borderWidth: 3, height: 44, justifyContent: "center", marginLeft: -22, marginTop: -22, position: "absolute", width: 44 },
  markerSelected: { backgroundColor: mobileColors.gold, transform: [{ scale: 1.12 }] },
  markerText: { color: mobileColors.ink, fontSize: 12, fontWeight: "800" },
  privacyNotice: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, bottom: 12, left: 12, padding: 12, position: "absolute", right: 12 },
  privacyTitle: { color: mobileColors.ink, fontSize: 14, fontWeight: "800" },
  privacyCopy: { color: mobileColors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }
});
