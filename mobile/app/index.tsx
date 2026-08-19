import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { exploreContent } from "../src/explore-content";

const colors = {
  paper: "#f9f7f2",
  surface: "#ffffff",
  mist: "#edf1eb",
  ink: "#191c1c",
  muted: "#687478",
  pine: "#1a4d4e",
  pineDeep: "#003637",
  water: "#9ed8e2",
  land: "#e1eadb",
  coral: "#f48c71",
  gold: "#c9a050",
  line: "rgba(26, 77, 78, 0.16)"
} as const;

const markers = [
  { id: "riverside", label: "1", top: "35%", left: "24%" },
  { id: "bridge", label: "2", top: "48%", left: "62%" },
  { id: "park", label: "3", top: "22%", left: "74%" }
] as const;

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.safeArea} testID="explore-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>{exploreContent.brand}</Text>
          <Text style={styles.heading}>{exploreContent.title}</Text>
        </View>
        <Pressable accessibilityLabel="프로필 열기" style={styles.profileButton}>
          <Text style={styles.profileInitial}>I</Text>
        </Pressable>
      </View>

      <View style={styles.map} accessibilityLabel="서울 한강 주변 공개 사진 지도">
        <View style={styles.landTop} />
        <View style={styles.landBottom} />
        <View style={styles.searchRow}>
          <TextInput
            accessibilityLabel="장소 검색"
            placeholder={exploreContent.searchPlaceholder}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          <Pressable accessibilityLabel="사진 범위 선택" style={styles.scopeButton}>
            <Text style={styles.scopeText}>공개</Text>
          </Pressable>
        </View>
        <Text style={styles.mapLabel}>{exploreContent.mapLabel}</Text>
        {markers.map((marker) => (
          <Pressable
            accessibilityLabel={`사진 위치 ${marker.label}`}
            key={marker.id}
            style={[styles.marker, { left: marker.left, top: marker.top }]}
          >
            <Text style={styles.markerText}>{marker.label}</Text>
          </Pressable>
        ))}
        <View accessibilityLabel="선택한 사진 미리보기" style={styles.preview}>
          <View style={styles.previewImage}>
            <View style={styles.sun} />
            <View style={styles.horizon} />
          </View>
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>{exploreContent.previewTitle}</Text>
            <Text style={styles.previewMeta}>{exploreContent.previewMeta}</Text>
          </View>
        </View>
      </View>

      <View accessibilityLabel="주요 탐색" style={styles.tabBar}>
        {exploreContent.tabs.map((tab, index) => (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: index === 0 }} key={tab} style={styles.tab}>
            <View style={[styles.tabIndicator, index === 0 && styles.tabIndicatorActive]} />
            <Text style={[styles.tabText, index === 0 && styles.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper, minWidth: 0 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 96,
    justifyContent: "space-between",
    paddingHorizontal: 16
  },
  brand: { color: colors.pine, fontFamily: "Georgia", fontSize: 16, fontWeight: "700" },
  heading: { color: colors.ink, fontSize: 28, fontWeight: "800", lineHeight: 34 },
  profileButton: {
    alignItems: "center",
    backgroundColor: colors.pineDeep,
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  profileInitial: { color: colors.surface, fontSize: 16, fontWeight: "800" },
  map: { backgroundColor: colors.water, flex: 1, minHeight: 0, overflow: "hidden", position: "relative" },
  landTop: {
    backgroundColor: colors.land,
    borderBottomRightRadius: 80,
    height: "32%",
    left: 0,
    position: "absolute",
    right: "18%",
    top: 0
  },
  landBottom: {
    backgroundColor: colors.land,
    borderTopLeftRadius: 72,
    bottom: 0,
    height: "32%",
    left: "28%",
    position: "absolute",
    right: 0
  },
  searchRow: { flexDirection: "row", gap: 8, left: 16, position: "absolute", right: 16, top: 16 },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    height: 48,
    paddingHorizontal: 16
  },
  scopeButton: {
    alignItems: "center",
    backgroundColor: colors.pineDeep,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 16
  },
  scopeText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  mapLabel: { color: colors.pineDeep, fontSize: 13, fontWeight: "700", left: 20, position: "absolute", top: 80 },
  marker: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderColor: colors.surface,
    borderRadius: 22,
    borderWidth: 3,
    height: 44,
    justifyContent: "center",
    marginLeft: -22,
    marginTop: -22,
    position: "absolute",
    width: 44
  },
  markerText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  preview: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    bottom: 16,
    flexDirection: "row",
    left: 16,
    padding: 8,
    position: "absolute",
    right: 16
  },
  previewImage: { backgroundColor: colors.mist, borderRadius: 6, height: 72, overflow: "hidden", position: "relative", width: 88 },
  sun: { backgroundColor: colors.gold, borderRadius: 10, height: 20, position: "absolute", right: 14, top: 13, width: 20 },
  horizon: { backgroundColor: colors.pine, bottom: 0, height: 30, left: 0, position: "absolute", right: 0 },
  previewCopy: { flex: 1, justifyContent: "center", minWidth: 0, paddingHorizontal: 12 },
  previewTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", lineHeight: 22 },
  previewMeta: { color: colors.muted, fontSize: 13, marginTop: 4 },
  tabBar: { backgroundColor: colors.surface, borderTopColor: colors.line, borderTopWidth: 1, flexDirection: "row", height: 72 },
  tab: { alignItems: "center", flex: 1, justifyContent: "center", minWidth: 0 },
  tabIndicator: { backgroundColor: "transparent", borderRadius: 2, height: 3, marginBottom: 8, width: 24 },
  tabIndicatorActive: { backgroundColor: colors.gold },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: colors.pineDeep }
});
