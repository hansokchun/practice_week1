import { useEffect, useMemo, useState } from "react";
import { ImageBackground, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextStyle, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchLandingContent, filterLandingPhotos, type LandingContent, type LandingPhoto } from "./landing-photo-repository";
import { RecoverableRemoteImage } from "./RecoverableRemoteImage";
import { DefaultProfileAvatar } from "./DefaultProfileAvatar";
import { mobileColors } from "./mobile-theme";
import { exploreRoute, guestLoginRoute, likesRoute, myPhotosRoute, profileRoute, uploadRoute } from "./mobile-routes";

type LandingScreenProps = {
  readonly loadContent?: () => Promise<LandingContent>;
  readonly navigate?: (route: string) => void;
  readonly openPhoto?: (photoId: string) => void;
  readonly refreshKey?: number;
  readonly signedIn: boolean;
};

type LandingState =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly content: LandingContent };

const suggestions = ["제주 바다", "서울 야경", "부산", "도쿄 골목", "벚꽃 여행"] as const;
const webKeepAllWords = Platform.OS === "web" ? ({ wordBreak: "keep-all" } as unknown as TextStyle) : undefined;

function photoLabel(photo: LandingPhoto): string {
  return photo.description?.trim() || photo.title?.trim() || photo.album?.trim() || "여행 사진";
}

export function LandingScreen({
  loadContent = fetchLandingContent,
  navigate = () => {},
  openPhoto = () => {},
  refreshKey = 0,
  signedIn
}: LandingScreenProps) {
  const [state, setState] = useState<LandingState>({ status: "loading" });
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    void loadContent().then((content) => {
      if (mounted) {
        setState({ status: "ready", content });
        refreshTimer = setTimeout(() => setReloadKey((value) => value + 1), 270_000);
      }
    }).catch(() => {
      if (mounted) setState({ status: "failed" });
    });
    return () => {
      mounted = false;
      if (refreshTimer !== undefined) clearTimeout(refreshTimer);
    };
  }, [loadContent, refreshKey, reloadKey]);

  const searchResults = useMemo(() => {
    if (state.status !== "ready" || query.length === 0) return [];
    const unique = new Map<string, LandingPhoto>();
    for (const section of state.content.sections) {
      for (const photo of filterLandingPhotos(section.photos, query)) unique.set(photo.id, photo);
    }
    return [...unique.values()];
  }, [query, state]);

  function submitSearch(nextQuery = draftQuery) {
    const normalized = nextQuery.trim();
    setDraftQuery(normalized);
    setQuery(normalized);
  }

  function go(route: string) {
    setAccountOpen(false);
    navigate(route);
  }

  const displayedSections = state.status !== "ready" ? [] : query.length > 0
    ? [{ id: "search-results", title: `“${query}” 검색 결과`, description: "", photos: searchResults }]
    : state.content.sections;

  return (
    <SafeAreaView style={styles.safeArea} testID="landing-screen">
      <View style={styles.header}>
        <Pressable accessibilityLabel="Ikkyee 랜딩으로 이동" accessibilityRole="button" onPress={() => { setDraftQuery(""); setQuery(""); }}>
          <Text style={styles.brand}>Ikkyee</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel="사진 추가" accessibilityRole="button" onPress={() => go(signedIn ? uploadRoute : guestLoginRoute)} style={styles.addButton}>
            <Text style={styles.addButtonText}>사진 추가</Text>
          </Pressable>
          {signedIn ? (
            <Pressable accessibilityLabel="계정 메뉴 열기" accessibilityRole="button" onPress={() => setAccountOpen((open) => !open)} style={styles.accountButton}>
              <DefaultProfileAvatar size={44} />
            </Pressable>
          ) : (
            <Pressable accessibilityLabel="로그인" accessibilityRole="button" onPress={() => go(guestLoginRoute)} style={styles.loginButton}>
              <Text style={styles.loginButtonText}>로그인</Text>
            </Pressable>
          )}
        </View>
      </View>

      {accountOpen ? (
        <View accessibilityLabel="계정 메뉴" style={styles.accountMenu}>
          {[
            { label: "내 프로필", route: profileRoute },
            { label: "내 사진", route: myPhotosRoute },
            { label: "좋아요한 사진", route: likesRoute }
          ].map((item) => (
            <Pressable accessibilityLabel={item.label} accessibilityRole="button" key={item.route} onPress={() => go(item.route)} style={styles.accountMenuItem}>
              <Text style={styles.accountMenuText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, webKeepAllWords]}>이끼에서 당신만의 장소를 찾아보세요</Text>
          <View style={styles.searchRow}>
            <TextInput
              accessibilityLabel="공개 사진 검색"
              onChangeText={setDraftQuery}
              onSubmitEditing={() => submitSearch()}
              placeholder="도시, 장소, 여행 분위기를 검색해 보세요"
              placeholderTextColor={mobileColors.muted}
              returnKeyType="search"
              style={styles.searchInput}
              value={draftQuery}
            />
            <Pressable accessibilityLabel="공개 사진 검색 실행" accessibilityRole="button" onPress={() => submitSearch()} style={styles.searchButton}>
              <Text style={styles.searchButtonText}>검색</Text>
            </Pressable>
          </View>
          <Text style={styles.suggestionLabel}>추천 검색어</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <Pressable accessibilityRole="button" key={suggestion} onPress={() => submitSearch(suggestion)} style={styles.suggestionChip}>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable accessibilityLabel="지도에서 찾아보기" accessibilityRole="button" onPress={() => go(exploreRoute)} style={styles.mapButton}>
            <Text style={styles.mapButtonText}>지도에서 찾아보기</Text>
          </Pressable>
        </View>

        {state.status === "loading" ? <Text accessibilityLiveRegion="polite" style={styles.status}>공개 사진을 불러오고 있어요</Text> : null}
        {state.status === "failed" ? (
          <View style={styles.statusCard}>
            <Text accessibilityLiveRegion="polite" style={styles.status}>공개 사진을 불러오지 못했어요.</Text>
            <Pressable accessibilityLabel="랜딩 사진 다시 불러오기" accessibilityRole="button" onPress={() => setReloadKey((value) => value + 1)} style={styles.retryButton}>
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : null}

        {displayedSections.map((section) => (
          <View accessibilityLabel={`${section.title} 사진 목록`} key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.description.length > 0 ? <Text style={styles.sectionDescription}>{section.description}</Text> : null}
            {section.photos.length === 0 ? (
              <Text style={styles.emptyText}>{query.length > 0 ? "검색 결과가 없어요." : "이 주제에 표시할 공개 사진이 아직 없어요."}</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                {section.photos.map((photo) => {
                  const label = photoLabel(photo);
                  return (
                    <Pressable accessibilityLabel={`${label} 상세 보기`} accessibilityRole="button" key={`${section.id}-${photo.id}`} onPress={() => openPhoto(photo.id)} style={styles.photoCard}>
                      <RecoverableRemoteImage accessibilityLabel={label} onRetry={() => setReloadKey((value) => value + 1)} style={styles.photo} uri={photo.imageUrl} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ))}

        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.footerMapVisual}>
          <ImageBackground imageStyle={styles.footerMapImage} resizeMode="contain" source={require("../assets/landing-map-pins-faded.jpg")} style={styles.footerMapBackground} />
        </View>
        <Text style={styles.footer}>여행 사진을 안전하게 보관하고, 선택한 순간만 공유하세요.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  header: { alignItems: "center", flexDirection: "row", height: 72, justifyContent: "space-between", paddingHorizontal: 16, zIndex: 3 },
  brand: { color: mobileColors.pine, fontFamily: "Georgia", fontSize: 22, fontWeight: "800" },
  headerActions: { alignItems: "center", flexDirection: "row", gap: 8 },
  addButton: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 22, justifyContent: "center", minHeight: 44, paddingHorizontal: 16 },
  addButtonText: { color: mobileColors.surface, fontSize: 14, fontWeight: "800" },
  accountButton: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", overflow: "hidden", width: 44 },
  loginButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 8 },
  loginButtonText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  accountMenu: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 12, borderWidth: 1, padding: 6, position: "absolute", right: 16, top: 68, width: 176, zIndex: 10 },
  accountMenuItem: { justifyContent: "center", minHeight: 48, paddingHorizontal: 12 },
  accountMenuText: { color: mobileColors.ink, fontSize: 15, fontWeight: "700" },
  content: { paddingBottom: 56 },
  hero: { alignItems: "center", paddingBottom: 48, paddingHorizontal: 16, paddingTop: 42 },
  heroTitle: { color: mobileColors.ink, fontSize: 28, fontWeight: "900", lineHeight: 36, textAlign: "center" },
  searchRow: { flexDirection: "row", gap: 8, marginTop: 28, width: "100%" },
  searchInput: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 12, borderWidth: 1, color: mobileColors.ink, flex: 1, fontSize: 15, height: 54, paddingHorizontal: 14 },
  searchButton: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 12, justifyContent: "center", minHeight: 54, paddingHorizontal: 16 },
  searchButtonText: { color: mobileColors.surface, fontSize: 14, fontWeight: "800" },
  suggestionLabel: { alignSelf: "flex-start", color: mobileColors.muted, fontSize: 12, fontWeight: "700", marginTop: 18 },
  suggestions: { alignSelf: "stretch", marginTop: 10 },
  suggestionChip: { backgroundColor: "#edf1eb", borderRadius: 18, justifyContent: "center", marginRight: 8, minHeight: 36, paddingHorizontal: 13 },
  suggestionText: { color: mobileColors.pineDeep, fontSize: 13, fontWeight: "700" },
  mapButton: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 8, justifyContent: "center", marginTop: 24, minHeight: 56, minWidth: 220, paddingHorizontal: 24 },
  mapButtonText: { color: mobileColors.surface, fontSize: 16, fontWeight: "800" },
  section: { marginBottom: 48 },
  sectionTitle: { color: mobileColors.ink, fontSize: 24, fontWeight: "900", paddingHorizontal: 16, textAlign: "center" },
  sectionDescription: { color: mobileColors.muted, fontSize: 14, marginTop: 8, paddingHorizontal: 24, textAlign: "center" },
  photoRow: { gap: 10, paddingHorizontal: 16, paddingTop: 28 },
  photoCard: { borderRadius: 14, height: 210, overflow: "hidden", width: 168 },
  photo: { backgroundColor: "#edf1eb", height: "100%", width: "100%" },
  statusCard: { alignItems: "center", marginBottom: 32 },
  status: { color: mobileColors.muted, fontSize: 14, padding: 24, textAlign: "center" },
  retryButton: { justifyContent: "center", minHeight: 44, paddingHorizontal: 16 },
  retryText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  emptyText: { color: mobileColors.muted, fontSize: 14, padding: 32, textAlign: "center" },
  footerMapVisual: { height: 210, marginTop: 4, width: "100%" },
  footerMapBackground: { height: 210, width: "100%" },
  footerMapImage: { height: "100%", opacity: 0.94, width: "100%" },
  footer: { color: mobileColors.muted, fontSize: 12, paddingHorizontal: 24, paddingTop: 24, textAlign: "center" }
});
