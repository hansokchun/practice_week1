import { useEffect, useState } from "react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { devicePhotoThumbnailCache } from "../../src/device-photo-thumbnail-cache";
import type { DevicePhotoDetail } from "../../src/device-photo-repository";
import { localPhotoIndexingRuntime } from "../../src/local-photo-indexing-runtime";
import { mobileColors } from "../../src/mobile-theme";
import { devicePhotoLocationRoute } from "../../src/mobile-routes";
import { useAuthSession } from "../../src/auth-session";
import type { PublicationResult } from "../../src/publication-publisher";
import { publicationRuntime } from "../../src/publication-runtime";
import { RecoverableDeviceThumbnail } from "../../src/RecoverableDeviceThumbnail";
import { regenerateDevicePhotoThumbnail } from "../../src/device-photo-thumbnail-recovery";

type DevicePhotoDetailScreenProps = {
  readonly assetId: string;
  readonly editLocation?: (assetId: string) => void;
  readonly goBack?: () => void;
  readonly loadPhoto?: (assetId: string) => Promise<DevicePhotoDetail | null>;
  readonly loadThumbnail?: (assetId: string) => Promise<string>;
  readonly recoverThumbnail?: (assetId: string) => Promise<string>;
  readonly retryPublication?: ((assetId: string) => Promise<PublicationResult>) | undefined;
  readonly deletePublication?: ((assetId: string) => Promise<{ readonly photoId: string }>) | undefined;
};

type DetailLoadState =
  | { readonly status: "loading" }
  | { readonly status: "not-found" }
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly photo: DevicePhotoDetail };

function mediaTypeLabel(mediaType: DevicePhotoDetail["mediaType"]): string {
  if (mediaType === "live_photo") return "Live Photo";
  if (mediaType === "video") return "동영상";
  return "사진";
}

function publicationLabel(state: DevicePhotoDetail["publicationState"]): string {
  if (state === "pending") return "클라우드 게시 대기 중";
  if (state === "published") return "클라우드 게시 완료";
  if (state === "failed") return "클라우드 게시 실패 · 재시도 필요";
  return "클라우드에 게시하지 않음";
}

function dimensionLabel(photo: DevicePhotoDetail): string {
  return photo.width === null || photo.height === null
    ? "해상도 정보 없음"
    : `${photo.width} × ${photo.height}`;
}

function capturedAtLabel(timestamp: number | null): string {
  if (timestamp === null) return "촬영 시각 정보 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

export function DevicePhotoDetailScreen({
  assetId,
  editLocation = (photoAssetId) => router.push({
    pathname: devicePhotoLocationRoute,
    params: { assetId: photoAssetId }
  } as unknown as Href),
  goBack = router.back,
  loadPhoto = localPhotoIndexingRuntime.getPhoto,
  loadThumbnail = devicePhotoThumbnailCache.getOrCreate,
  recoverThumbnail = regenerateDevicePhotoThumbnail,
  retryPublication,
  deletePublication
}: DevicePhotoDetailScreenProps) {
  const [state, setState] = useState<DetailLoadState>({ status: "loading" });
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [retryState, setRetryState] = useState<"idle" | "retrying" | "failed">("idle");
  const [deleteState, setDeleteState] = useState<"idle" | "confirming" | "deleting" | "failed">("idle");

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setState({ status: "loading" });
      setThumbnailUri(null);
    });
    void loadPhoto(assetId)
      .then(async (photo) => {
        if (!active) return;
        if (photo === null) {
          setState({ status: "not-found" });
          return;
        }
        setState({ status: "ready", photo });
        const uri = await loadThumbnail(assetId).catch(() => null);
        if (active) setThumbnailUri(uri);
      })
      .catch(() => {
        if (active) setState({ status: "failed" });
      });
    return () => {
      active = false;
    };
  }, [assetId, loadPhoto, loadThumbnail]);

  async function retry() {
    if (state.status !== "ready" || state.photo.publicationState !== "failed" ||
      retryPublication === undefined || retryState === "retrying") return;
    setRetryState("retrying");
    try {
      const result = await retryPublication(state.photo.id);
      if (result.failed > 0) {
        setRetryState("failed");
        return;
      }
      setState({ status: "ready", photo: { ...state.photo, publicationState: "published" } });
      setRetryState("idle");
    } catch (cause) {
      void cause;
      setRetryState("failed");
    }
  }

  async function removePublication() {
    if (state.status !== "ready" || state.photo.publicationState !== "published" ||
      deletePublication === undefined || deleteState === "deleting") return;
    setDeleteState("deleting");
    try {
      await deletePublication(state.photo.id);
      setState({ status: "ready", photo: { ...state.photo, publicationState: "not-published" } });
      setDeleteState("idle");
    } catch (cause) {
      void cause;
      setDeleteState("failed");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="내 사진으로 돌아가기" accessibilityRole="button" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>내 사진</Text>
          <Text style={styles.heading}>기기 사진 상세</Text>
        </View>
      </View>

      {state.status === "loading" ? (
        <Status title="사진 정보를 확인하고 있어요" description="기기의 로컬 인덱스만 읽고 있습니다." />
      ) : state.status === "not-found" ? (
        <Status title="기기에서 사진을 찾지 못했어요" description="사진이 삭제되었거나 접근 권한이 변경되었을 수 있습니다." />
      ) : state.status === "failed" ? (
        <Status title="사진 정보를 불러오지 못했어요" description="내 사진으로 돌아가 다시 정리해 주세요." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {thumbnailUri === null ? (
            <View accessibilityLabel="기기 사진 미리보기 준비 중" style={styles.photoPlaceholder} />
          ) : (
            <RecoverableDeviceThumbnail
              accessibilityLabel="기기 사진 미리보기"
              assetId={state.photo.id}
              initialUri={thumbnailUri}
              recoverThumbnail={recoverThumbnail}
              style={styles.photo}
            />
          )}

          <View style={styles.localCard}>
            <Text style={styles.cardEyebrow}>기기 저장 상태</Text>
            <Text style={styles.cardTitle}>기기 원본 사용 가능</Text>
            <Text style={styles.cardCopy}>원본은 사진 보관함에 있으며 Ikkyee는 변경하거나 자동 업로드하지 않습니다.</Text>
          </View>

          <View style={styles.cloudCard}>
            <Text style={styles.cardEyebrow}>클라우드 상태</Text>
            <Text style={styles.cardTitle}>{publicationLabel(state.photo.publicationState)}</Text>
            <Text style={styles.cardCopy}>게시 작업은 사용자가 명시적으로 선택하고 확인한 경우에만 시작됩니다.</Text>
            {state.photo.publicationState === "failed" ? (
              retryPublication === undefined ? (
                <Text style={styles.retryCopy}>로그인하면 실패한 게시를 직접 다시 시도할 수 있습니다.</Text>
              ) : (
                <>
                  {retryState === "failed" ? (
                    <Text accessibilityLiveRegion="polite" style={styles.retryError}>원본 접근이나 네트워크 상태를 확인하고 다시 시도해 주세요.</Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={retryState === "retrying"}
                    onPress={() => void retry()}
                    style={[styles.retryButton, retryState === "retrying" && styles.disabledButton]}
                  >
                    <Text style={styles.retryButtonText}>{retryState === "retrying" ? "게시 재시도 중" : "게시 다시 시도"}</Text>
                  </Pressable>
                </>
              )
            ) : null}
            {state.photo.publicationState === "published" && deletePublication !== undefined ? (
              deleteState === "confirming" || deleteState === "failed" ? (
                <View style={styles.deleteConfirm}>
                  <Text style={styles.deleteWarning}>클라우드의 게시물·좋아요·댓글·공유 링크가 삭제됩니다.</Text>
                  <Text style={styles.deleteWarning}>기기 원본은 삭제되지 않습니다.</Text>
                  {deleteState === "failed" ? <Text accessibilityLiveRegion="polite" style={styles.retryError}>게시 사진을 삭제하지 못했어요. 다시 시도해 주세요.</Text> : null}
                  <View style={styles.deleteActions}>
                    <Pressable accessibilityRole="button" onPress={() => setDeleteState("idle")} style={styles.cancelDeleteButton}>
                      <Text style={styles.cancelDeleteText}>취소</Text>
                    </Pressable>
                    <Pressable accessibilityLabel="클라우드 게시 사진 삭제 확인" accessibilityRole="button" onPress={() => void removePublication()} style={styles.confirmDeleteButton}>
                      <Text style={styles.confirmDeleteText}>게시 사진 삭제</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityLabel="클라우드 게시 사진 삭제"
                  accessibilityRole="button"
                  disabled={deleteState === "deleting"}
                  onPress={() => setDeleteState("confirming")}
                  style={[styles.deleteButton, deleteState === "deleting" && styles.disabledButton]}
                >
                  <Text style={styles.deleteButtonText}>{deleteState === "deleting" ? "게시 사진 삭제 중" : "게시 사진 삭제"}</Text>
                </Pressable>
              )
            ) : null}
          </View>

          <View style={styles.metadataCard}>
            <Text style={styles.sectionTitle}>원본 메타데이터</Text>
            <MetadataRow label="형식" value={mediaTypeLabel(state.photo.mediaType)} />
            <MetadataRow label="해상도" value={dimensionLabel(state.photo)} />
            <MetadataRow label="촬영 시각" value={capturedAtLabel(state.photo.capturedAt)} />
            <MetadataRow label="위치" value={state.photo.hasPrivateLocation ? "비공개 위치 있음" : "위치 정보 없음"} />
            <Pressable
              accessibilityRole="button"
              onPress={() => editLocation(state.photo.id)}
              style={styles.locationButton}
            >
              <Text style={styles.locationButtonText}>{state.photo.hasPrivateLocation ? "위치 수정" : "위치 추가"}</Text>
            </Pressable>
          </View>

          <Text style={styles.privacyCopy}>정확한 위치 좌표와 EXIF 원문은 이 화면이나 앱 로그에 표시하지 않습니다.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MetadataRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={styles.metadataRow}>
      <Text style={styles.metadataLabel}>{label}</Text>
      <Text style={styles.metadataValue}>{value}</Text>
    </View>
  );
}

function Status({ title, description }: { readonly title: string; readonly description: string }) {
  return (
    <View style={styles.status}>
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusCopy}>{description}</Text>
    </View>
  );
}

export default function DevicePhotoDetailRoute() {
  const auth = useAuthSession();
  const params = useLocalSearchParams<{ readonly assetId?: string | string[] }>();
  const assetId = Array.isArray(params.assetId) ? params.assetId[0] ?? "" : params.assetId ?? "";
  const ownerId = auth.user?.id;
  return <DevicePhotoDetailScreen
    assetId={assetId}
    retryPublication={ownerId === undefined ? undefined : (photoAssetId) => publicationRuntime.retry(ownerId, photoAssetId)}
    deletePublication={ownerId === undefined ? undefined : (photoAssetId) => publicationRuntime.delete(ownerId, photoAssetId)}
  />;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  header: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 72, paddingHorizontal: 16 },
  backButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  backText: { color: mobileColors.ink, fontSize: 31, lineHeight: 34, marginTop: -3 },
  eyebrow: { color: mobileColors.pine, fontSize: 12, fontWeight: "800" },
  heading: { color: mobileColors.ink, fontSize: 21, fontWeight: "800", marginTop: 2 },
  content: { gap: 12, padding: 16, paddingBottom: 36 },
  photo: { aspectRatio: 4 / 5, backgroundColor: mobileColors.surface, borderRadius: 8, width: "100%" },
  photoPlaceholder: { aspectRatio: 4 / 5, backgroundColor: mobileColors.surface, borderRadius: 8, width: "100%" },
  localCard: { backgroundColor: "#e1eadb", borderRadius: 8, padding: 16 },
  cloudCard: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, padding: 16 },
  cardEyebrow: { color: mobileColors.pine, fontSize: 12, fontWeight: "800" },
  cardTitle: { color: mobileColors.ink, fontSize: 17, fontWeight: "800", marginTop: 5 },
  cardCopy: { color: mobileColors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  disabledButton: { opacity: 0.55 },
  metadataCard: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, padding: 16 },
  sectionTitle: { color: mobileColors.ink, fontSize: 17, fontWeight: "800", marginBottom: 6 },
  metadataRow: { alignItems: "flex-start", borderBottomColor: mobileColors.line, borderBottomWidth: 1, flexDirection: "row", gap: 12, justifyContent: "space-between", paddingVertical: 11 },
  metadataLabel: { color: mobileColors.muted, fontSize: 13 },
  metadataValue: { color: mobileColors.ink, flexShrink: 1, fontSize: 13, fontWeight: "700", textAlign: "right" },
  locationButton: { alignItems: "center", borderColor: mobileColors.pineDeep, borderRadius: 8, borderWidth: 1, justifyContent: "center", marginTop: 14, minHeight: 44 },
  locationButtonText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  retryButton: { alignItems: "center", borderColor: mobileColors.pineDeep, borderRadius: 8, borderWidth: 1, justifyContent: "center", marginTop: 14, minHeight: 44 },
  retryButtonText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  retryCopy: { color: mobileColors.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
  retryError: { color: "#9b2c2c", fontSize: 12, lineHeight: 18, marginTop: 10 },
  deleteButton: { alignItems: "center", borderColor: "#9b2c2c", borderRadius: 8, borderWidth: 1, justifyContent: "center", marginTop: 14, minHeight: 44 },
  deleteButtonText: { color: "#9b2c2c", fontSize: 14, fontWeight: "800" },
  deleteConfirm: { borderTopColor: mobileColors.line, borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
  deleteWarning: { color: "#7f1d1d", fontSize: 12, lineHeight: 18 },
  deleteActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  cancelDeleteButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 44 },
  cancelDeleteText: { color: mobileColors.ink, fontSize: 13, fontWeight: "800" },
  confirmDeleteButton: { alignItems: "center", backgroundColor: "#9b2c2c", borderRadius: 8, flex: 1, justifyContent: "center", minHeight: 44 },
  confirmDeleteText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  privacyCopy: { color: mobileColors.muted, fontSize: 12, lineHeight: 18, paddingHorizontal: 4 },
  status: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  statusTitle: { color: mobileColors.ink, fontSize: 20, fontWeight: "800", textAlign: "center" },
  statusCopy: { color: mobileColors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" }
});
