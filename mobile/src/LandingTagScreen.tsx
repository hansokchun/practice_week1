import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  LANDING_TAG_INITIAL_COUNT,
  LANDING_TAG_LOAD_COUNT,
  buildLandingTagFeed,
  filterLandingTagPhotosByRegion,
  getLandingTagRegions
} from "./landing-tag-feed";
import { fetchLandingContent, type LandingContent, type LandingPhoto } from "./landing-photo-repository";
import { mobileColors } from "./mobile-theme";
import { RecoverableRemoteImage } from "./RecoverableRemoteImage";

type LandingTagScreenProps = {
  readonly sectionId: string;
  readonly loadContent?: () => Promise<LandingContent>;
  readonly openPhoto?: (photoId: string) => void;
  readonly goBack?: () => void;
  readonly seed?: string;
};

type TagState =
  | { readonly status: "loading" }
  | { readonly status: "failed" | "missing" }
  | { readonly status: "ready"; readonly content: LandingContent };

const APP_SESSION_SEED = `${Date.now()}-${Math.random()}`;

function photoLabel(photo: LandingPhoto): string {
  return photo.description?.trim() || photo.title?.trim() || photo.album?.trim() || "여행 사진";
}

export function LandingTagScreen({
  sectionId,
  loadContent = fetchLandingContent,
  openPhoto = () => {},
  goBack = () => {},
  seed
}: LandingTagScreenProps) {
  const { width } = useWindowDimensions();
  const sessionSeed = seed ?? APP_SESSION_SEED;
  const [state, setState] = useState<TagState>({ status: "loading" });
  const [region, setRegion] = useState("");
  const [visibleCount, setVisibleCount] = useState(LANDING_TAG_INITIAL_COUNT);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    void loadContent().then((content) => {
      if (!mounted) return;
      setState(content.sections.some((section) => section.id === sectionId)
        ? { status: "ready", content }
        : { status: "missing" });
    }).catch(() => {
      if (mounted) setState({ status: "failed" });
    });
    return () => { mounted = false; };
  }, [loadContent, reloadKey, sectionId]);

  const section = state.status === "ready"
    ? state.content.sections.find((item) => item.id === sectionId) ?? null
    : null;
  const feed = useMemo(() => section === null ? [] : buildLandingTagFeed(section, sessionSeed), [section, sessionSeed]);
  const regions = useMemo(() => getLandingTagRegions(feed), [feed]);
  const filtered = useMemo(() => filterLandingTagPhotosByRegion(feed, region), [feed, region]);
  const visible = filtered.slice(0, visibleCount);
  const tileWidth = Math.max(140, Math.floor((width - 52) / 2));

  function chooseRegion(nextRegion: string) {
    setRegion(nextRegion);
    setVisibleCount(LANDING_TAG_INITIAL_COUNT);
  }

  function loadMore() {
    setVisibleCount((count) => Math.min(filtered.length, count + LANDING_TAG_LOAD_COUNT));
  }

  function retry() {
    setState({ status: "loading" });
    setReloadKey((value) => value + 1);
  }

  if (state.status === "loading") {
    return <TagStatus title="사진을 불러오고 있어요" goBack={goBack} />;
  }
  if (state.status === "failed") {
    return <TagStatus title="사진을 불러오지 못했어요" goBack={goBack} retry={retry} />;
  }
  if (state.status === "missing" || section === null) {
    return <TagStatus title="이 주제를 찾을 수 없어요" goBack={goBack} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} testID="landing-tag-screen">
      <FlatList
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        data={visible}
        keyExtractor={(photo) => photo.id}
        ListEmptyComponent={<Text style={styles.emptyText}>이 지역에 해당하는 공개 사진이 아직 없어요.</Text>}
        ListFooterComponent={visible.length < filtered.length ? (
          <Pressable accessibilityLabel="사진 더 보기" accessibilityRole="button" onPress={loadMore} style={styles.loadMoreButton}>
            <Text style={styles.loadingMore}>사진 더 보기</Text>
          </Pressable>
        ) : filtered.length > LANDING_TAG_INITIAL_COUNT ? (
          <Text style={styles.loadingMore}>{filtered.length}장의 사진을 모두 표시했어요</Text>
        ) : null}
        ListHeaderComponent={(
          <View>
            <View style={styles.header}>
              <Pressable accessibilityLabel="랜딩으로 돌아가기" accessibilityRole="button" onPress={goBack} style={styles.backButton}>
                <Text style={styles.backIcon}>‹</Text>
              </Pressable>
              <Text style={styles.brand}>Ikkyee</Text>
              <View style={styles.headerSpacer} />
            </View>
            <View style={styles.intro}>
              <Text style={styles.title}>{section.title}</Text>
              <Text style={styles.summary}>{feed.length}장의 사진{regions.length > 0 ? ` · ${regions.length}개 지역` : ""}</Text>
              {section.description.length > 0 ? <Text style={styles.description}>{section.description}</Text> : null}
            </View>
            {regions.length > 0 ? (
              <ScrollView contentContainerStyle={styles.regionRow} horizontal showsHorizontalScrollIndicator={false}>
                <RegionChip active={region === ""} label="전체" onPress={() => chooseRegion("")} />
                {regions.map((item) => (
                  <RegionChip active={region === item.label} key={item.label} label={item.label} onPress={() => chooseRegion(item.label)} />
                ))}
              </ScrollView>
            ) : null}
            {region.length > 0 ? <Text style={styles.filteredCount}>{filtered.length}장의 사진</Text> : null}
          </View>
        )}
        numColumns={2}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => {
          const label = photoLabel(item);
          return (
            <Pressable
              accessibilityLabel={`${label} 상세 보기`}
              accessibilityRole="button"
              onPress={() => openPhoto(item.id)}
              style={[styles.photoTile, { width: tileWidth }]}
            >
              <RecoverableRemoteImage accessibilityLabel={label} onRetry={() => setReloadKey((value) => value + 1)} style={styles.photo} uri={item.imageUrl} />
            </Pressable>
          );
        }}
        testID="landing-tag-grid"
      />
    </SafeAreaView>
  );
}

function RegionChip({ active, label, onPress }: { readonly active: boolean; readonly label: string; readonly onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={`${label} 지역`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.regionChip, active && styles.regionChipActive]}
    >
      <Text style={[styles.regionText, active && styles.regionTextActive]}>{label}</Text>
    </Pressable>
  );
}

function TagStatus({ title, goBack, retry }: { readonly title: string; readonly goBack: () => void; readonly retry?: () => void }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="랜딩으로 돌아가기" accessibilityRole="button" onPress={goBack} style={styles.backButton}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.brand}>Ikkyee</Text><View style={styles.headerSpacer} />
      </View>
      <View style={styles.statusBody}>
        <Text style={styles.statusTitle}>{title}</Text>
        {retry === undefined ? null : (
          <Pressable accessibilityLabel="태그 사진 다시 불러오기" accessibilityRole="button" onPress={retry} style={styles.retryButton}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  header: { alignItems: "center", flexDirection: "row", height: 64, justifyContent: "space-between", paddingHorizontal: 12 },
  backButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  backIcon: { color: mobileColors.pineDeep, fontSize: 38, lineHeight: 40 },
  brand: { color: mobileColors.pine, fontFamily: "Georgia", fontSize: 18, fontWeight: "800" },
  headerSpacer: { width: 44 },
  intro: { alignItems: "center", paddingBottom: 24, paddingHorizontal: 20, paddingTop: 20 },
  title: { color: mobileColors.ink, fontSize: 30, fontWeight: "900" },
  summary: { color: mobileColors.muted, fontSize: 14, fontWeight: "700", marginTop: 10 },
  description: { color: mobileColors.muted, fontSize: 14, lineHeight: 21, marginTop: 12, textAlign: "center" },
  regionRow: { gap: 8, paddingBottom: 28, paddingHorizontal: 16 },
  regionChip: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 18, borderWidth: 1, justifyContent: "center", minHeight: 40, paddingHorizontal: 15 },
  regionChipActive: { backgroundColor: mobileColors.pineDeep, borderColor: mobileColors.pineDeep },
  regionText: { color: mobileColors.pineDeep, fontSize: 13, fontWeight: "700" },
  regionTextActive: { color: mobileColors.surface },
  filteredCount: { color: mobileColors.muted, fontSize: 13, fontWeight: "700", paddingBottom: 18, paddingHorizontal: 16 },
  grid: { paddingBottom: 48, paddingHorizontal: 16 },
  row: { gap: 20, marginBottom: 24 },
  photoTile: { aspectRatio: 0.72, borderRadius: 6, overflow: "hidden" },
  photo: { backgroundColor: "#edf1eb", height: "100%", width: "100%" },
  emptyText: { color: mobileColors.muted, fontSize: 14, padding: 40, textAlign: "center" },
  loadingMore: { color: mobileColors.muted, fontSize: 12, padding: 24, textAlign: "center" },
  loadMoreButton: { alignItems: "center", justifyContent: "center", minHeight: 48 },
  statusBody: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  statusTitle: { color: mobileColors.ink, fontSize: 18, fontWeight: "800", textAlign: "center" },
  retryButton: { alignItems: "center", justifyContent: "center", marginTop: 20, minHeight: 44, paddingHorizontal: 20 },
  retryText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" }
});
