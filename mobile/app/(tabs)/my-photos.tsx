import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";

import {
  expoDevicePhotoLibraryAdapter,
  loadAuthorizedPhotoPreview,
  resolvePhotoLibraryPermission,
  type DevicePhotoLibraryAdapter,
  type DevicePhotoPreview,
  type PhotoLibraryAccess,
  type ResolvedPhotoLibraryPermission
} from "../../src/device-photo-library";
import {
  localPhotoIndexingRuntime,
  type LocalPhotoRefreshResult
} from "../../src/local-photo-indexing-runtime";
import { mobileColors } from "../../src/mobile-theme";
import { devicePhotoThumbnailCache } from "../../src/device-photo-thumbnail-cache";
import { hydrateDevicePhotoThumbnails } from "../../src/device-photo-thumbnails";
import { PrivatePhotoMap } from "../../src/private-photo-map";
import { albumsRoute, devicePhotoDetailRoute, publicationReviewRoute } from "../../src/mobile-routes";
import { isDevicePhotoLocationMissing } from "../../src/device-photo-location";
import {
  createPublicationReviewParams,
  togglePublicationPhoto,
  type PublicationIntent,
  type PublicationSelection
} from "../../src/publication-selection";
import { publicationDerivativeRuntime } from "../../src/publication-derivative-runtime";
import { RecoverableDeviceThumbnail } from "../../src/RecoverableDeviceThumbnail";
import { regenerateDevicePhotoThumbnail } from "../../src/device-photo-thumbnail-recovery";

type MyPhotosScreenProps = {
  readonly adapter?: DevicePhotoLibraryAdapter;
  readonly clearPublicationDerivatives?: () => Promise<unknown>;
  readonly clearThumbnailCache?: () => Promise<void>;
  readonly refreshLocalPhotos?: () => Promise<LocalPhotoRefreshResult>;
  readonly loadThumbnail?: (assetId: string) => Promise<string>;
  readonly recoverThumbnail?: (assetId: string) => Promise<string>;
  readonly openPhoto?: (assetId: string) => void;
  readonly openAlbums?: () => void;
  readonly openSettings?: () => Promise<void>;
  readonly startPublicationReview?: (selection: PublicationSelection) => void;
};

type IndexingState =
  | { readonly status: "idle" | "indexing" | "failed" }
  | { readonly status: "completed" | "limit-reached"; readonly count: number };

type PhotoViewMode = "grid" | "map";

export function MyPhotosScreen({
  adapter = expoDevicePhotoLibraryAdapter,
  clearPublicationDerivatives = publicationDerivativeRuntime.clear,
  clearThumbnailCache = devicePhotoThumbnailCache.clear,
  refreshLocalPhotos = localPhotoIndexingRuntime.refresh,
  loadThumbnail = devicePhotoThumbnailCache.getOrCreate,
  recoverThumbnail = regenerateDevicePhotoThumbnail,
  openPhoto = (assetId) => router.push({
    pathname: devicePhotoDetailRoute,
    params: { assetId }
  } as unknown as Href),
  openAlbums = () => router.push(albumsRoute),
  openSettings = Linking.openSettings,
  startPublicationReview = (selection) => router.push({
    pathname: publicationReviewRoute,
    params: createPublicationReviewParams(selection.intent, selection.assetIds)
  } as unknown as Href)
}: MyPhotosScreenProps) {
  const previousAccess = useRef<PhotoLibraryAccess>("none");
  const [permission, setPermission] = useState<ResolvedPhotoLibraryPermission | null>(null);
  const [photos, setPhotos] = useState<readonly DevicePhotoPreview[]>([]);
  const [mapPhotos, setMapPhotos] = useState<readonly DevicePhotoPreview[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indexing, setIndexing] = useState<IndexingState>({ status: "idle" });
  const [viewMode, setViewMode] = useState<PhotoViewMode>("grid");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<readonly string[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const refresh = useCallback(async (requestAccess = false) => {
    setBusy(true);
    setError(null);
    try {
      const response = requestAccess
        ? await adapter.requestPermission()
        : await adapter.getPermission();
      const resolved = resolvePhotoLibraryPermission(previousAccess.current, response);
      previousAccess.current = resolved.access;
      setPermission(resolved);
      if (resolved.state !== "full" && resolved.state !== "limited") {
        await Promise.allSettled([clearThumbnailCache(), clearPublicationDerivatives()]);
        setSelectionMode(false);
        setSelectedPhotoIds([]);
      }
      const preview = await loadAuthorizedPhotoPreview(adapter, resolved.state);
      setPhotos(preview);
      setMapPhotos([]);
      const thumbnailPreview = hydrateDevicePhotoThumbnails(preview, loadThumbnail);
      if (resolved.state === "full" || resolved.state === "limited") {
        setIndexing({ status: "indexing" });
        try {
          const result = await refreshLocalPhotos();
          setIndexing({
            status: result.scan.status,
            count: result.scan.processedAssetCount
          });
          const indexedPhotos = await hydrateDevicePhotoThumbnails(result.photos, loadThumbnail);
          setPhotos(indexedPhotos);
          setSelectedPhotoIds((current) => current.filter((assetId) =>
            indexedPhotos.some((photo) => photo.id === assetId)
          ));
          setMapPhotos(result.mapPhotos);
        } catch (cause) {
          void cause;
          setIndexing({ status: "failed" });
          setPhotos(await thumbnailPreview);
          setMapPhotos(preview);
        }
      } else {
        setIndexing({ status: "idle" });
        setPhotos(await thumbnailPreview);
      }
    } catch (cause) {
      void cause;
      setError("기기 사진을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }, [adapter, clearPublicationDerivatives, clearThumbnailCache, loadThumbnail, refreshLocalPhotos]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  async function manageLimitedAccess() {
    setBusy(true);
    setError(null);
    try {
      await adapter.manageLimitedAccess();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "접근할 사진을 변경하지 못했습니다.");
      setBusy(false);
    }
  }

  function toggleSelectionMode() {
    setSelectionError(null);
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedPhotoIds([]);
      return;
    }
    setViewMode("grid");
    setSelectionMode(true);
  }

  function toggleSelectedPhoto(assetId: string) {
    try {
      setSelectedPhotoIds(togglePublicationPhoto(selectedPhotoIds, assetId));
      setSelectionError(null);
    } catch (cause) {
      void cause;
      setSelectionError("사진은 최대 20장까지 선택할 수 있습니다.");
    }
  }

  function reviewSelection(intent: PublicationIntent) {
    if (selectedPhotoIds.length === 0) return;
    startPublicationReview({ intent, assetIds: selectedPhotoIds });
  }

  const authorized = permission?.state === "full" || permission?.state === "limited";

  return (
    <SafeAreaView edges={[]} style={styles.safeArea} testID="my-photos-screen">
      <View style={styles.libraryTabs}>
        <View accessibilityLabel="사진 보기" style={[styles.libraryTab, styles.libraryTabActive]}>
          <Text style={[styles.libraryTabText, styles.libraryTabTextActive]}>사진</Text>
        </View>
        <Pressable accessibilityLabel="앨범 보기" accessibilityRole="button" onPress={openAlbums} style={styles.libraryTab}>
          <Text style={styles.libraryTabText}>앨범</Text>
        </Pressable>
      </View>
      {busy && permission === null ? (
        <StatusBody title="사진 접근 상태를 확인하고 있어요" description="기기의 원본 사진은 변경하거나 자동 업로드하지 않습니다." />
      ) : error !== null ? (
        <StatusBody
          actionLabel="다시 시도"
          description={error}
          onAction={() => void refresh()}
          title="사진을 불러오지 못했어요"
        />
      ) : !authorized ? (
        <StatusBody
          actionLabel={permission?.canAskAgain === false ? "설정 열기" : "사진 접근 허용"}
          description={permission?.state === "revoked"
            ? "사진 접근 권한이 변경되었습니다. 임시 사진 처리를 중단했으며 다시 허용한 사진만 표시합니다."
            : "여행 사진을 기기 안에서 확인하려면 사진 접근 권한이 필요합니다. 원본은 자동 업로드되지 않습니다."}
          onAction={permission?.canAskAgain === false ? () => void openSettings() : () => void refresh(true)}
          title={permission?.state === "revoked" ? "사진 접근이 해제되었어요" : "기기 사진을 가져오세요"}
        />
      ) : (
        <View style={styles.content}>
          {permission.state === "limited" ? (
            <View style={styles.limitedBanner}>
              <View style={styles.limitedCopy}>
                <Text style={styles.limitedTitle}>선택한 사진만 표시하고 있어요</Text>
                <Text style={styles.limitedDescription}>운영체제에서 허용한 사진만 Ikkyee가 읽을 수 있습니다.</Text>
              </View>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void manageLimitedAccess()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>접근 사진 관리</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.viewModeControls}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setViewMode("grid")}
              style={[styles.viewModeButton, viewMode === "grid" && styles.viewModeButtonActive]}
            >
              <Text style={[styles.viewModeText, viewMode === "grid" && styles.viewModeTextActive]}>사진 보기</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={selectionMode}
              onPress={() => setViewMode("map")}
              style={[
                styles.viewModeButton,
                viewMode === "map" && styles.viewModeButtonActive,
                selectionMode && styles.disabledButton
              ]}
            >
              <Text style={[styles.viewModeText, viewMode === "map" && styles.viewModeTextActive]}>지도 보기</Text>
            </Pressable>
          </View>

          <View style={styles.selectionControls}>
            <Pressable
              accessibilityRole="button"
              onPress={toggleSelectionMode}
              style={[styles.secondaryButton, selectionMode && styles.selectionCancelButton]}
            >
              <Text style={styles.secondaryButtonText}>{selectionMode ? "선택 취소" : "사진 선택"}</Text>
            </Pressable>
            {selectionMode ? <Text style={styles.selectionCount}>{selectedPhotoIds.length}장 선택</Text> : null}
          </View>

          {selectionMode ? (
            <View style={styles.publicationBar}>
              <Text style={styles.publicationHint}>게시 방식을 선택해 검토합니다. 아직 업로드하지 않습니다.</Text>
              <View style={styles.publicationActions}>
                <PublicationAction disabled={selectedPhotoIds.length === 0} label="비공개 저장" onPress={() => reviewSelection("private")} />
                <PublicationAction disabled={selectedPhotoIds.length === 0} label="링크 공유" onPress={() => reviewSelection("link")} />
                <PublicationAction disabled={selectedPhotoIds.length === 0} label="공개 게시" onPress={() => reviewSelection("public")} />
              </View>
              {selectionError !== null ? <Text style={styles.selectionError}>{selectionError}</Text> : null}
            </View>
          ) : null}

          <IndexingNotice state={indexing} />

          {photos.length === 0 ? (
            <StatusBody
              actionLabel="새로고침"
              description="허용된 보관함에서 표시할 사진을 찾지 못했습니다."
              onAction={() => void refresh()}
              title="가져올 사진이 없어요"
            />
          ) : viewMode === "map" ? (
            <PrivatePhotoMap onSelectPhoto={openPhoto} photos={mapPhotos} />
          ) : (
            <FlatList
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.grid}
              data={photos}
              keyExtractor={(photo) => photo.id}
              numColumns={2}
              renderItem={({ item }) => {
                const selected = selectedPhotoIds.includes(item.id);
                return (
                  <Pressable
                    accessibilityLabel={selectionMode
                      ? `게시용 사진 선택 ${item.filename ?? "기기 사진"}`
                      : `사진 상세 열기 ${item.filename ?? "기기 사진"}`}
                    accessibilityRole="button"
                    accessibilityState={selectionMode ? { selected } : undefined}
                    onPress={() => selectionMode ? toggleSelectedPhoto(item.id) : openPhoto(item.id)}
                    style={[styles.photoTile, selected && styles.selectedPhotoTile]}
                  >
                    <RecoverableDeviceThumbnail
                      accessibilityLabel={item.filename ?? "기기 사진"}
                      assetId={item.id}
                      initialUri={item.thumbnailUri ?? item.id}
                      recoverThumbnail={recoverThumbnail}
                      style={styles.photo}
                    />
                    {selectionMode ? (
                      <View style={[styles.selectionIndicator, selected && styles.selectionIndicatorActive]}>
                        <Text style={[styles.selectionIndicatorText, selected && styles.selectionIndicatorTextActive]}>{selected ? "✓" : "○"}</Text>
                      </View>
                    ) : null}
                    <Text numberOfLines={1} style={styles.filename}>{item.filename ?? "이름 없는 사진"}</Text>
                    {(indexing.status === "completed" || indexing.status === "limit-reached") &&
                      isDevicePhotoLocationMissing(item) ? (
                        <Text style={styles.missingLocation}>위치 없음</Text>
                      ) : null}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function PublicationAction({
  disabled,
  label,
  onPress
}: {
  readonly disabled: boolean;
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.publicationAction, disabled && styles.disabledButton]}
    >
      <Text style={styles.publicationActionText}>{label}</Text>
    </Pressable>
  );
}

function IndexingNotice({ state }: { readonly state: IndexingState }) {
  const message = state.status === "indexing"
    ? "기기 사진을 안전하게 정리하고 있어요"
    : state.status === "completed"
      ? `기기 사진 ${state.count}장 정리 완료`
      : state.status === "limit-reached"
        ? `기기 사진 ${state.count}장 정리됨 · 다음 실행에서 계속`
        : state.status === "failed"
          ? "사진 정리를 완료하지 못했어요. 다음 방문 때 다시 시도합니다."
          : null;

  return message === null ? null : (
    <Text accessibilityLiveRegion="polite" style={styles.indexingNotice}>{message}</Text>
  );
}

type StatusBodyProps = {
  readonly actionLabel?: string;
  readonly description: string;
  readonly onAction?: () => void;
  readonly title: string;
};

function StatusBody({ actionLabel, description, onAction, title }: StatusBodyProps) {
  return (
    <View style={styles.statusBody}>
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusDescription}>{description}</Text>
      {actionLabel !== undefined ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function MyPhotosRoute() {
  return <MyPhotosScreen />;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  content: { flex: 1 },
  libraryTabs: { alignSelf: "flex-start", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, flexDirection: "row", marginHorizontal: 16, marginTop: 12, padding: 3 },
  libraryTab: { alignItems: "center", borderRadius: 6, justifyContent: "center", minHeight: 40, minWidth: 76, paddingHorizontal: 14 },
  libraryTabActive: { backgroundColor: mobileColors.pineDeep },
  libraryTabText: { color: mobileColors.muted, fontSize: 13, fontWeight: "800" },
  libraryTabTextActive: { color: mobileColors.surface },
  statusBody: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  statusTitle: { color: mobileColors.ink, fontSize: 20, fontWeight: "800", textAlign: "center" },
  statusDescription: { color: mobileColors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: "center" },
  primaryButton: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 8, justifyContent: "center", marginTop: 24, minHeight: 48, paddingHorizontal: 20 },
  primaryButtonText: { color: mobileColors.surface, fontSize: 15, fontWeight: "800" },
  limitedBanner: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderWidth: 1, gap: 12, marginBottom: 12, marginHorizontal: 16, padding: 14 },
  limitedCopy: { flexShrink: 1 },
  limitedTitle: { color: mobileColors.ink, fontSize: 15, fontWeight: "800" },
  limitedDescription: { color: mobileColors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  indexingNotice: { color: mobileColors.muted, fontSize: 12, marginBottom: 10, marginHorizontal: 16 },
  secondaryButton: { alignItems: "center", alignSelf: "flex-start", borderColor: mobileColors.pineDeep, borderRadius: 8, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 14 },
  secondaryButtonText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  viewModeControls: { alignSelf: "flex-start", backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, flexDirection: "row", marginBottom: 12, marginHorizontal: 16, padding: 3 },
  viewModeButton: { alignItems: "center", borderRadius: 6, justifyContent: "center", minHeight: 40, paddingHorizontal: 14 },
  viewModeButtonActive: { backgroundColor: mobileColors.pineDeep },
  viewModeText: { color: mobileColors.muted, fontSize: 13, fontWeight: "800" },
  viewModeTextActive: { color: mobileColors.surface },
  disabledButton: { opacity: 0.45 },
  selectionControls: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 12, marginHorizontal: 16 },
  selectionCancelButton: { backgroundColor: mobileColors.surface },
  selectionCount: { color: mobileColors.ink, fontSize: 14, fontWeight: "800" },
  publicationBar: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, gap: 10, marginBottom: 12, marginHorizontal: 16, padding: 12 },
  publicationHint: { color: mobileColors.muted, fontSize: 12, lineHeight: 18 },
  publicationActions: { flexDirection: "row", gap: 6 },
  publicationAction: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 7, flex: 1, justifyContent: "center", minHeight: 42, paddingHorizontal: 7 },
  publicationActionText: { color: mobileColors.surface, fontSize: 12, fontWeight: "800", textAlign: "center" },
  selectionError: { color: "#9b2c2c", fontSize: 12 },
  grid: { paddingBottom: 24, paddingHorizontal: 16 },
  row: { gap: 8 },
  photoTile: { borderColor: "transparent", borderRadius: 10, borderWidth: 2, flex: 1, marginBottom: 16, minWidth: 0, padding: 2, position: "relative" },
  selectedPhotoTile: { borderColor: mobileColors.pineDeep },
  photo: { aspectRatio: 4 / 5, backgroundColor: mobileColors.surface, borderRadius: 8, width: "100%" },
  selectionIndicator: { alignItems: "center", backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 15, borderWidth: 1, height: 30, justifyContent: "center", position: "absolute", right: 10, top: 10, width: 30 },
  selectionIndicatorActive: { backgroundColor: mobileColors.pineDeep, borderColor: mobileColors.pineDeep },
  selectionIndicatorText: { color: mobileColors.muted, fontSize: 17, fontWeight: "800" },
  selectionIndicatorTextActive: { color: mobileColors.surface },
  filename: { color: mobileColors.ink, fontSize: 13, marginTop: 7 },
  missingLocation: { color: mobileColors.muted, fontSize: 12, fontWeight: "700", marginTop: 3 }
});
