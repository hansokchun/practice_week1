import { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { exploreContent } from "../../src/explore-content";
import { getExploreConnectivity, type ExploreConnectivity } from "../../src/explore-connectivity";
import { ExploreMapSurface as DefaultExploreMapSurface } from "../../src/ExploreMapSurface";
import type { ExploreMapSurfaceComponent } from "../../src/ExploreMapSurface.types";
import { areExploreBoundsEquivalent } from "../../src/explore-map-viewport";
import { createExploreMarkerClusters, getNextExploreClusterPhotoId } from "../../src/explore-marker-clusters";
import {
  getExplorePhotoScopeOptions,
  normalizeExplorePhotoScope,
  type ExplorePhotoScope
} from "../../src/explore-photo-scope";
import { profileRoute, publicPhotoDetailRoute } from "../../src/mobile-routes";
import { PlaceSearchError, type PlaceSearchResult } from "../../src/place-search";
import { placeSearchRuntime } from "../../src/place-search-runtime";
import { RecoverableRemoteImage } from "../../src/RecoverableRemoteImage";
import { DefaultProfileAvatar } from "../../src/DefaultProfileAvatar";
import {
  fetchExplorePhotoPage,
  fetchOwnedPhotoBounds,
  SEOUL_EXPLORE_BOUNDS,
  type ExplorePhoto
} from "../../src/explore-photo-repository";
import { useAuthSession } from "../../src/auth-session";
import { LandingScreen } from "../../src/LandingScreen";
import { useContentVisibilityRefreshKey } from "../../src/content-visibility-refresh";
import { formatPhotoDate } from "../../src/photo-date";

const colors = {
  paper: "#f9f7f2",
  surface: "#ffffff",
  mist: "#edf1eb",
  ink: "#191c1c",
  muted: "#687478",
  pine: "#1a4d4e",
  pineDeep: "#003637",
  water: "#9ed8e2",
  line: "rgba(26, 77, 78, 0.16)"
} as const;

type ExploreScreenProps = {
  readonly initialFocus?: { readonly photoId: string; readonly lat: number; readonly lng: number; readonly scope: ExplorePhotoScope };
  readonly loadOwnerBounds?: typeof fetchOwnedPhotoBounds;
  readonly MapSurface?: ExploreMapSurfaceComponent;
  readonly loadPage?: typeof fetchExplorePhotoPage;
  readonly openPhoto?: (photoId: string) => void;
  readonly refreshKey?: number;
  readonly getConnectivity?: () => Promise<ExploreConnectivity>;
  readonly searchPlaces?: (query: string, bias: typeof SEOUL_EXPLORE_BOUNDS) => Promise<readonly PlaceSearchResult[]>;
  readonly viewerId?: string | null;
};

type ExploreState =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly reason: "offline" | "network" }
  | { readonly status: "ready"; readonly photos: readonly ExplorePhoto[]; readonly hasMore: boolean; readonly nextOffset: number; readonly loadingMore: boolean; readonly pageError: "offline" | "network" | null };

type PlaceSearchState =
  | { readonly status: "idle" | "searching" }
  | { readonly status: "results"; readonly places: readonly PlaceSearchResult[] }
  | { readonly status: "empty" | "failed" | "offline" | "unavailable" | "network" | "quota" | "configuration" };

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { readonly name?: unknown }).name === "AbortError";
}

export function ExploreScreen({
  initialFocus,
  MapSurface = DefaultExploreMapSurface,
  loadOwnerBounds = fetchOwnedPhotoBounds,
  loadPage = fetchExplorePhotoPage,
  openPhoto = (photoId) => router.push({ pathname: publicPhotoDetailRoute, params: { photoId } }),
  refreshKey = 0,
  getConnectivity = getExploreConnectivity,
  searchPlaces = placeSearchRuntime.search,
  viewerId = null
}: ExploreScreenProps) {
  const [bounds, setBounds] = useState(() => initialFocus === undefined ? SEOUL_EXPLORE_BOUNDS : ({
    north: Math.min(90, initialFocus.lat + 0.06),
    south: Math.max(-90, initialFocus.lat - 0.06),
    east: Math.min(180, initialFocus.lng + 0.08),
    west: Math.max(-180, initialFocus.lng - 0.08)
  }));
  const [state, setState] = useState<ExploreState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<PlaceSearchState>({ status: "idle" });
  const [searchedPlaceName, setSearchedPlaceName] = useState<string | null>(null);
  const [scope, setScope] = useState<ExplorePhotoScope>(() => initialFocus?.scope ?? (viewerId === null ? "others" : "mine"));
  const [scopeOpen, setScopeOpen] = useState(false);
  const pageAbortRef = useRef<AbortController | null>(null);
  const searchRequestRef = useRef(0);

  const normalizedViewerId = typeof viewerId === "string" && viewerId.trim().length > 0 ? viewerId : null;
  const normalizedScope = normalizeExplorePhotoScope(scope, normalizedViewerId);
  const scopeOptions = getExplorePhotoScopeOptions(normalizedViewerId);
  const scopeLabel = scopeOptions.find((option) => option.id === normalizedScope)?.label ?? "공개 사진";

  useEffect(() => {
    if (initialFocus !== undefined || normalizedScope !== "mine" || normalizedViewerId === null) return undefined;
    const controller = new AbortController();
    void loadOwnerBounds(normalizedViewerId, controller.signal)
      .then((ownerBounds) => {
        if (!controller.signal.aborted && ownerBounds !== null) setBounds(ownerBounds);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [initialFocus, loadOwnerBounds, normalizedScope, normalizedViewerId]);

  useEffect(() => {
    const controller = new AbortController();
    pageAbortRef.current?.abort();
    pageAbortRef.current = controller;
    queueMicrotask(() => { if (!controller.signal.aborted) setState({ status: "loading" }); });
    void (async () => {
      const connectivity = await getConnectivity();
      if (controller.signal.aborted) return;
      if (connectivity === "offline") {
        setState({ status: "failed", reason: "offline" });
        return;
      }
      try {
        const page = await loadPage({
          bounds, offset: 0, pageSize: 20, scope: normalizedScope,
          viewerId: normalizedViewerId, signal: controller.signal
        });
        if (controller.signal.aborted) return;
        setState({ status: "ready", ...page, loadingMore: false, pageError: null });
        setSelectedId((current) => {
          if (current !== null && page.photos.some((photo) => photo.id === current)) return current;
          return page.photos.some((photo) => photo.id === initialFocus?.photoId)
            ? initialFocus?.photoId ?? null
            : page.photos[0]?.id ?? null;
        });
      } catch (error: unknown) {
        if (!controller.signal.aborted && !isAbortError(error)) {
          const failureConnectivity = await getConnectivity();
          if (!controller.signal.aborted) {
            setState({ status: "failed", reason: failureConnectivity === "offline" ? "offline" : "network" });
          }
        }
      }
    })();
    return () => controller.abort();
  }, [bounds, getConnectivity, initialFocus?.photoId, loadPage, normalizedScope, normalizedViewerId, refreshKey, reloadKey]);

  async function loadMore() {
    if (state.status !== "ready" || !state.hasMore || state.loadingMore) return;
    const current = state;
    const controller = new AbortController();
    pageAbortRef.current?.abort();
    pageAbortRef.current = controller;
    setState({ ...current, loadingMore: true, pageError: null });
    try {
      const connectivity = await getConnectivity();
      if (controller.signal.aborted) return;
      if (connectivity === "offline") {
        setState({ ...current, loadingMore: false, pageError: "offline" });
        return;
      }
      const page = await loadPage({
        bounds, offset: current.nextOffset, pageSize: 20, scope: normalizedScope,
        viewerId: normalizedViewerId, signal: controller.signal
      });
      if (controller.signal.aborted) return;
      setState({
        status: "ready",
        photos: [...current.photos, ...page.photos.filter((photo) => !current.photos.some((existing) => existing.id === photo.id))],
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
        loadingMore: false,
        pageError: null
      });
    } catch (error) {
      if (!controller.signal.aborted && !isAbortError(error)) {
        const failureConnectivity = await getConnectivity();
        if (!controller.signal.aborted) {
          setState({ ...current, loadingMore: false, pageError: failureConnectivity === "offline" ? "offline" : "network" });
        }
      }
    }
  }

  const photos = state.status === "ready" ? state.photos : [];
  const selectedPhoto = photos.find((photo) => photo.id === selectedId) ?? photos[0] ?? null;
  const markerClusters = createExploreMarkerClusters(photos, bounds);

  function updateBounds(nextBounds: typeof SEOUL_EXPLORE_BOUNDS): void {
    setBounds((current) => {
      if (areExploreBoundsEquivalent(current, nextBounds)) return current;
      setSearchedPlaceName(null);
      return nextBounds;
    });
  }

  async function submitPlaceSearch(): Promise<void> {
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    if (query.trim().length === 0) {
      setSearchState({ status: "failed" });
      return;
    }
    setScopeOpen(false);
    setSearchState({ status: "searching" });
    const connectivity = await getConnectivity();
    if (requestId !== searchRequestRef.current) return;
    if (connectivity === "offline") {
      setSearchState({ status: "offline" });
      return;
    }
    try {
      const places = await searchPlaces(query, bounds);
      if (requestId !== searchRequestRef.current) return;
      setSearchState(places.length === 0 ? { status: "empty" } : { status: "results", places });
    } catch (error) {
      if (requestId !== searchRequestRef.current) return;
      const failureStatus = error instanceof PlaceSearchError &&
        ["unavailable", "network", "quota", "configuration"].includes(error.code)
        ? error.code as "unavailable" | "network" | "quota" | "configuration"
        : "failed";
      setSearchState({ status: failureStatus });
    }
  }

  function selectPlace(place: PlaceSearchResult): void {
    searchRequestRef.current += 1;
    setBounds(place.viewport);
    setSelectedId(null);
    setSearchedPlaceName(place.name);
    setQuery(place.name);
    setSearchState({ status: "idle" });
    Keyboard.dismiss();
  }

  function chooseScope(nextScope: ExplorePhotoScope): void {
    setScope(normalizeExplorePhotoScope(nextScope, normalizedViewerId));
    setScopeOpen(false);
    setSelectedId(null);
  }

  return (
    <SafeAreaView style={styles.safeArea} testID="explore-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>{exploreContent.brand}</Text>
          <Text style={styles.heading}>{exploreContent.title}</Text>
        </View>
        <Pressable accessibilityLabel="프로필 열기" accessibilityRole="button" onPress={() => router.push(profileRoute)} style={styles.profileButton} testID="profile-open">
          <DefaultProfileAvatar size={44} />
        </Pressable>
      </View>

      <View style={styles.map} accessibilityLabel={normalizedScope === "mine" ? "현재 영역의 내 사진 지도" : "현재 영역의 공개 사진 지도"}>
        <MapSurface
          bounds={bounds}
          clusters={markerClusters}
          onBoundsChange={updateBounds}
          onClusterPress={(photoIds) => setSelectedId(getNextExploreClusterPhotoId(photoIds, selectedPhoto?.id ?? null))}
          photoKind={normalizedScope === "mine" ? "owned" : "public"}
          selectedPhotoId={selectedPhoto?.id ?? null}
        />
        <View style={styles.searchRow}>
          <TextInput
            accessibilityLabel="장소 검색"
            onChangeText={(value) => {
              setQuery(value);
              if (searchState.status !== "idle") setSearchState({ status: "idle" });
            }}
            onSubmitEditing={() => void submitPlaceSearch()}
            placeholder={exploreContent.searchPlaceholder}
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          <Pressable accessibilityLabel="장소 검색 실행" accessibilityRole="button" disabled={searchState.status === "searching"} onPress={() => void submitPlaceSearch()} style={styles.searchButton} testID="place-search-submit">
            <Text style={styles.searchButtonText}>{searchState.status === "searching" ? "…" : "검색"}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`사진 범위 ${scopeLabel}`}
            accessibilityRole="button"
            onPress={() => setScopeOpen((current) => !current)}
            style={styles.scopeButton}
          >
            <Text numberOfLines={1} style={styles.scopeText}>{normalizedScope === "mine" ? "내 사진" : normalizedViewerId === null ? "공개" : "다른 사진"}</Text>
          </Pressable>
        </View>
        {scopeOpen ? (
          <View accessibilityLabel="사진 범위 선택" style={styles.scopeMenu}>
            {scopeOptions.map((option) => (
              <Pressable
                accessibilityLabel={`${option.label} 보기`}
                accessibilityRole="button"
                key={option.id}
                onPress={() => chooseScope(option.id)}
                style={[styles.scopeOption, option.id === normalizedScope && styles.scopeOptionSelected]}
              >
                <Text style={styles.scopeOptionText}>{option.label}{option.id === normalizedScope ? " ✓" : ""}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {searchState.status === "results" ? (
          <View accessibilityLabel="장소 검색 결과" style={styles.searchPanel}>
            {searchState.places.map((place) => (
              <Pressable
                accessibilityLabel={`${place.name} ${place.address}로 지도 이동`}
                accessibilityRole="button"
                key={place.id}
                onPress={() => selectPlace(place)}
                style={styles.placeResult}
              >
                <Text style={styles.placeName}>{place.name}</Text>
                <Text numberOfLines={1} style={styles.placeAddress}>{place.address}</Text>
              </Pressable>
            ))}
            <Text accessibilityLabel="Google 제공" style={styles.googleAttribution}>Powered by Google</Text>
          </View>
        ) : ["empty", "failed", "offline", "unavailable", "network", "quota", "configuration"].includes(searchState.status) ? (
          <View style={styles.searchPanel}>
            <Text accessibilityLiveRegion="polite" style={styles.searchMessage}>{searchState.status === "empty"
              ? "검색 결과가 없어요."
              : searchState.status === "offline" ? "인터넷 연결 후 장소를 검색해 주세요."
                : searchState.status === "network" ? "인터넷 연결 후 장소를 다시 검색해 주세요."
                  : searchState.status === "quota" ? "장소 검색 사용량이 잠시 초과됐어요."
                    : searchState.status === "configuration" ? "장소 검색을 잠시 사용할 수 없어요."
                : searchState.status === "unavailable" ? "이 빌드에서는 장소 검색을 사용할 수 없어요."
                  : "장소를 검색하지 못했어요."}</Text>
            {!["unavailable", "configuration"].includes(searchState.status) ? (
              <Pressable accessibilityLabel="장소 검색 다시 시도" accessibilityRole="button" onPress={() => void submitPlaceSearch()} style={styles.searchRetry}>
                <Text style={styles.searchRetryText}>다시 시도</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.mapLabel}>{searchedPlaceName ?? (areExploreBoundsEquivalent(bounds, SEOUL_EXPLORE_BOUNDS) ? exploreContent.mapLabel : "현재 지도 영역")}</Text>
        {state.status === "loading" ? (
          <View style={styles.statusCard}><Text accessibilityLiveRegion="polite" style={styles.statusText}>{normalizedScope === "mine" ? "내 사진을 불러오고 있어요" : "공개 사진을 불러오고 있어요"}</Text></View>
        ) : state.status === "failed" ? (
          <View style={styles.statusCard}>
            <Text accessibilityLiveRegion="polite" style={styles.statusText}>{state.reason === "offline" ? "인터넷 연결이 없어요" : normalizedScope === "mine" ? "내 사진을 불러오지 못했어요" : "공개 사진을 불러오지 못했어요"}</Text>
            {state.reason === "offline" ? <Text style={styles.statusHint}>연결을 확인한 뒤 다시 시도해 주세요.</Text> : null}
            <Pressable accessibilityLabel={state.reason === "offline" ? "연결 후 다시 시도" : "공개 사진 다시 시도"} accessibilityRole="button" onPress={() => setReloadKey((value) => value + 1)} style={styles.retryButton}>
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : photos.length === 0 ? (
          <View style={styles.statusCard}><Text style={styles.statusText}>{normalizedScope === "mine" ? "이 지도 영역에 내 사진이 없어요" : "이 지도 영역에 공개 사진이 없어요"}</Text></View>
        ) : selectedPhoto === null ? null : (
          <View accessibilityLabel="선택한 사진 미리보기" style={styles.preview}>
            <RecoverableRemoteImage accessibilityLabel="선택한 공개 사진" onRetry={() => setReloadKey((value) => value + 1)} style={styles.previewImage} uri={selectedPhoto.imageUrl} />
            <View style={styles.previewCopy}>
              <Text numberOfLines={2} style={styles.previewTitle}>{selectedPhoto.description ?? "여행 사진"}</Text>
              <Text style={styles.previewMeta}>{formatPhotoDate(selectedPhoto.date)}{normalizedScope === "mine" ? ` · ${selectedPhoto.visibility === "public" ? "공개" : selectedPhoto.visibility === "link" ? "링크 공개" : "비공개"}` : ""}</Text>
              {state.pageError ? <Text accessibilityLiveRegion="polite" style={styles.pageError}>{state.pageError === "offline" ? "인터넷 연결 후 사진을 더 불러올 수 있어요." : "사진을 더 불러오지 못했어요."}</Text> : null}
            </View>
            <Pressable accessibilityLabel="사진 자세히 보기" accessibilityRole="button" onPress={() => openPhoto(selectedPhoto.id)} style={styles.detailButton}>
              <Text style={styles.detailButtonText}>자세히</Text>
            </Pressable>
            {state.hasMore ? (
              <Pressable
                accessibilityLabel={state.pageError ? "추가 공개 사진 다시 시도" : "추가 공개 사진 불러오기"}
                accessibilityRole="button"
                disabled={state.loadingMore}
                onPress={() => void loadMore()}
                style={styles.moreButton}
              >
                <Text style={styles.moreText}>{state.loadingMore ? "불러오는 중" : state.pageError ? "재시도" : "더 보기"}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
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
  profileButton: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", overflow: "hidden", width: 44 },
  map: { backgroundColor: colors.water, flex: 1, minHeight: 0, overflow: "hidden", position: "relative" },
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
  searchButton: {
    alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 8,
    borderWidth: 1, height: 48, justifyContent: "center", minWidth: 48, paddingHorizontal: 8
  },
  searchButtonText: { color: colors.pineDeep, fontSize: 12, fontWeight: "800" },
  scopeButton: {
    alignItems: "center",
    backgroundColor: colors.pineDeep,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    maxWidth: 88,
    minWidth: 48,
    paddingHorizontal: 10
  },
  scopeText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  scopeMenu: {
    backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 8, borderWidth: 1,
    padding: 4, position: "absolute", right: 16, top: 72, zIndex: 4
  },
  scopeOption: { borderRadius: 6, justifyContent: "center", minHeight: 44, paddingHorizontal: 14 },
  scopeOptionSelected: { backgroundColor: colors.mist },
  scopeOptionText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  searchPanel: {
    backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 8, borderWidth: 1,
    left: 16, padding: 6, position: "absolute", right: 16, top: 72, zIndex: 3
  },
  placeResult: { borderRadius: 6, justifyContent: "center", minHeight: 52, paddingHorizontal: 10, paddingVertical: 6 },
  placeName: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  placeAddress: { color: colors.muted, fontSize: 12, marginTop: 2 },
  googleAttribution: { alignSelf: "flex-end", color: colors.muted, fontSize: 10, paddingHorizontal: 8, paddingVertical: 4 },
  searchMessage: { color: colors.ink, fontSize: 13, fontWeight: "700", padding: 10 },
  searchRetry: { alignItems: "center", alignSelf: "flex-start", justifyContent: "center", minHeight: 44, paddingHorizontal: 10 },
  searchRetryText: { color: colors.pineDeep, fontSize: 13, fontWeight: "800" },
  mapLabel: { color: colors.pineDeep, fontSize: 13, fontWeight: "700", left: 20, position: "absolute", top: 80 },
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
  previewImage: { backgroundColor: colors.mist, borderRadius: 6, height: 72, width: 88 },
  previewCopy: { flex: 1, justifyContent: "center", minWidth: 0, paddingHorizontal: 12 },
  previewTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", lineHeight: 22 },
  previewMeta: { color: colors.muted, fontSize: 13, marginTop: 4 },
  pageError: { color: "#9b2c2c", fontSize: 11, marginTop: 3 },
  statusCard: { alignItems: "center", alignSelf: "center", backgroundColor: colors.surface, borderRadius: 8, marginTop: 120, padding: 16 },
  statusText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  statusHint: { color: colors.muted, fontSize: 12, marginTop: 6 },
  retryButton: { marginTop: 10, minHeight: 44, paddingHorizontal: 18, justifyContent: "center" },
  retryText: { color: colors.pineDeep, fontSize: 14, fontWeight: "800" },
  moreButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 8 },
  moreText: { color: colors.pineDeep, fontSize: 12, fontWeight: "800" },
  detailButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 8 },
  detailButtonText: { color: colors.pineDeep, fontSize: 12, fontWeight: "800" }
});

export default function ExploreRoute() {
  const auth = useAuthSession();
  const refreshKey = useContentVisibilityRefreshKey();
  return (
    <LandingScreen
      navigate={(route) => router.push(route as never)}
      openPhoto={(photoId) => router.push({ pathname: publicPhotoDetailRoute, params: { photoId } })}
      refreshKey={refreshKey}
      signedIn={auth.status === "signed_in"}
    />
  );
}
