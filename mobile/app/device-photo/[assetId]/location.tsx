import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getPrivateMapPosition,
  getPrivateLocationFromMapPress,
  type PrivateDevicePhotoLocation
} from "../../../src/device-photo-location";
import { localPhotoLocationRuntime } from "../../../src/local-photo-location-runtime";
import { mobileColors } from "../../../src/mobile-theme";

type DevicePhotoLocationScreenProps = {
  readonly assetId: string;
  readonly goBack?: () => void;
  readonly loadLocation?: (assetId: string) => Promise<PrivateDevicePhotoLocation | null>;
  readonly saveLocation?: (
    assetId: string,
    location: PrivateDevicePhotoLocation
  ) => Promise<void>;
};

export function DevicePhotoLocationScreen({
  assetId,
  goBack = router.back,
  loadLocation = localPhotoLocationRuntime.getLocation,
  saveLocation = localPhotoLocationRuntime.saveLocation
}: DevicePhotoLocationScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PrivateDevicePhotoLocation | null>(null);
  const [locationChanged, setLocationChanged] = useState(false);
  const [mapSize, setMapSize] = useState({ width: 320, height: 360 });

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      setSelectedLocation(null);
      setLocationChanged(false);
    });
    void loadLocation(assetId)
      .then((location) => {
        if (active) setSelectedLocation(location);
      })
      .catch(() => {
        if (active) setError("저장된 위치를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [assetId, loadLocation]);

  function selectMapLocation(event: GestureResponderEvent) {
    setSelectedLocation(getPrivateLocationFromMapPress({
      x: event.nativeEvent.locationX,
      y: event.nativeEvent.locationY,
      width: mapSize.width,
      height: mapSize.height
    }));
    setLocationChanged(true);
    setError(null);
  }

  function updateMapSize(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setMapSize({ width, height });
  }

  async function persistLocation() {
    if (selectedLocation === null || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveLocation(assetId, selectedLocation);
      goBack();
    } catch (cause) {
      void cause;
      setError("위치를 저장하지 못했습니다. 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  const markerPosition = selectedLocation === null
    ? null
    : getPrivateMapPosition(selectedLocation);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="사진 상세로 돌아가기" accessibilityRole="button" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>기기 전용</Text>
          <Text style={styles.heading}>비공개 위치 보정</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{loading
          ? "저장된 위치를 확인하고 있어요"
          : selectedLocation === null
            ? "사진 위치를 선택해 주세요"
            : locationChanged
              ? "새 위치를 선택했어요"
              : "저장된 위치를 조정할 수 있어요"}</Text>
        <Text style={styles.description}>지도를 눌러 촬영 위치를 지정하세요. 정확한 좌표는 기기의 로컬 SQLite에만 저장됩니다.</Text>

        <Pressable
          accessibilityLabel="비공개 위치 선택 지도"
          accessibilityRole="button"
          disabled={loading}
          onLayout={updateMapSize}
          onPress={selectMapLocation}
          style={styles.map}
        >
          <View style={styles.landWest} />
          <View style={styles.landEast} />
          <View style={[styles.gridLine, styles.horizontal]} />
          <View style={[styles.gridLine, styles.vertical]} />
          <Text style={styles.northLabel}>북쪽</Text>
          <Text style={styles.southLabel}>남쪽</Text>
          {markerPosition === null ? null : (
            <View
              accessibilityLabel="선택한 비공개 사진 위치"
              pointerEvents="none"
              style={[
                styles.marker,
                { left: `${markerPosition.leftPercent}%`, top: `${markerPosition.topPercent}%` }
              ]}
            />
          )}
        </Pressable>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>이 위치는 아직 공개되지 않아요</Text>
          <Text style={styles.privacyCopy}>Explore나 클라우드 게시에는 사용하지 않으며, 게시 단계에서 별도로 공개 범위를 확인합니다.</Text>
        </View>

        {error === null ? null : <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}

        <Pressable
          accessibilityRole="button"
          disabled={selectedLocation === null || saving}
          onPress={() => void persistLocation()}
          style={[styles.saveButton, (selectedLocation === null || saving) && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveText}>{saving ? "저장 중" : "이 위치 저장"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function DevicePhotoLocationRoute() {
  const params = useLocalSearchParams<{ readonly assetId?: string | string[] }>();
  const assetId = Array.isArray(params.assetId) ? params.assetId[0] ?? "" : params.assetId ?? "";
  return <DevicePhotoLocationScreen assetId={assetId} />;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  header: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 72, paddingHorizontal: 16 },
  backButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  backText: { color: mobileColors.ink, fontSize: 31, lineHeight: 34, marginTop: -3 },
  eyebrow: { color: mobileColors.pine, fontSize: 12, fontWeight: "800" },
  heading: { color: mobileColors.ink, fontSize: 21, fontWeight: "800", marginTop: 2 },
  content: { flex: 1, padding: 16 },
  title: { color: mobileColors.ink, fontSize: 20, fontWeight: "800" },
  description: { color: mobileColors.muted, fontSize: 14, lineHeight: 21, marginTop: 7 },
  map: { backgroundColor: "#9ed8e2", borderRadius: 8, height: 360, marginTop: 18, overflow: "hidden", position: "relative", width: "100%" },
  landWest: { backgroundColor: "#e1eadb", borderBottomRightRadius: 90, bottom: "33%", left: 0, position: "absolute", top: 0, width: "58%" },
  landEast: { backgroundColor: "#e1eadb", borderTopLeftRadius: 80, bottom: 0, position: "absolute", right: 0, top: "42%", width: "52%" },
  gridLine: { backgroundColor: "rgba(0, 54, 55, 0.09)", position: "absolute" },
  horizontal: { height: 1, left: 0, right: 0, top: "50%" },
  vertical: { bottom: 0, left: "50%", top: 0, width: 1 },
  northLabel: { color: mobileColors.pineDeep, fontSize: 12, fontWeight: "800", left: 12, position: "absolute", top: 10 },
  southLabel: { bottom: 10, color: mobileColors.pineDeep, fontSize: 12, fontWeight: "800", position: "absolute", right: 12 },
  marker: { backgroundColor: "#f48c71", borderColor: mobileColors.surface, borderRadius: 13, borderWidth: 3, height: 26, marginLeft: -13, marginTop: -13, position: "absolute", width: 26 },
  privacyCard: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, marginTop: 12, padding: 14 },
  privacyTitle: { color: mobileColors.ink, fontSize: 14, fontWeight: "800" },
  privacyCopy: { color: mobileColors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  error: { color: "#9b2c2c", fontSize: 13, marginTop: 10 },
  saveButton: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 8, justifyContent: "center", marginTop: 16, minHeight: 48 },
  saveButtonDisabled: { opacity: 0.45 },
  saveText: { color: mobileColors.surface, fontSize: 15, fontWeight: "800" }
});
