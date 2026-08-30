import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthSession } from "../../src/auth-session";
import { EmptyTabScreen } from "../../src/EmptyTabScreen";
import { fetchLikedPhotos, setPhotoLiked, type LikedPhoto } from "../../src/liked-photo-repository";
import { guestLoginRoute, publicPhotoDetailRoute } from "../../src/mobile-routes";
import { mobileColors } from "../../src/mobile-theme";
import { RecoverableRemoteImage } from "../../src/RecoverableRemoteImage";
import { useContentVisibilityRefreshKey } from "../../src/content-visibility-refresh";
import { formatPhotoDate } from "../../src/photo-date";

type LikesScreenProps = {
  readonly loadPhotos?: (signal?: AbortSignal) => Promise<readonly LikedPhoto[]>;
  readonly openPhoto?: (photoId: string) => void;
  readonly refreshKey?: number;
  readonly signedIn?: boolean;
  readonly updateLike?: (photoId: string, shouldLike: boolean) => Promise<number>;
};

type LikesState =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly photos: readonly LikedPhoto[]; readonly error: boolean; readonly pendingIds: ReadonlySet<string> };

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { readonly name?: unknown }).name === "AbortError";
}

export function LikesScreen({
  loadPhotos = fetchLikedPhotos,
  openPhoto = (photoId) => router.push({ pathname: publicPhotoDetailRoute, params: { photoId } }),
  refreshKey = 0,
  signedIn = false,
  updateLike = setPhotoLiked
}: LikesScreenProps) {
  const [state, setState] = useState<LikesState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    if (!signedIn) return () => controller.abort();
    queueMicrotask(() => { if (!controller.signal.aborted) setState({ status: "loading" }); });
    void loadPhotos(controller.signal)
      .then((photos) => {
        if (!controller.signal.aborted) setState({ status: "ready", photos, error: false, pendingIds: new Set() });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbortError(error)) setState({ status: "failed" });
      });
    return () => controller.abort();
  }, [loadPhotos, refreshKey, retryKey, signedIn]);

  if (!signedIn) return (
    <EmptyTabScreen
      actionLabel="로그인하기"
      description="Explore에서 마음에 든 장소와 사진을 저장하고 여기서 다시 확인하세요."
      emptyTitle="로그인하면 좋아요 한 사진을 모아볼 수 있어요"
      onAction={() => router.push(guestLoginRoute)}
      testID="likes-screen"
      title="좋아요"
    />
  );

  async function unlike(photo: LikedPhoto, index: number) {
    if (state.status !== "ready" || state.pendingIds.has(photo.id)) return;
    const previous = state;
    setState({
      status: "ready", photos: previous.photos.filter((item) => item.id !== photo.id), error: false,
      pendingIds: new Set([...previous.pendingIds, photo.id])
    });
    try {
      await updateLike(photo.id, false);
      setState((current) => current.status === "ready"
        ? { ...current, pendingIds: new Set([...current.pendingIds].filter((id) => id !== photo.id)) }
        : current);
    } catch {
      setState((current) => {
        if (current.status !== "ready") return current;
        const photos = [...current.photos];
        if (!photos.some((item) => item.id === photo.id)) photos.splice(Math.min(index, photos.length), 0, photo);
        return {
          status: "ready", photos, error: true,
          pendingIds: new Set([...current.pendingIds].filter((id) => id !== photo.id))
        };
      });
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} testID="likes-screen">
      <View style={styles.header}>
        <Text style={styles.brand}>Ikkyee</Text>
        <Text style={styles.heading}>좋아요</Text>
      </View>
      {state.status === "loading" ? (
        <View style={styles.center}><Text accessibilityLiveRegion="polite" style={styles.title}>좋아요 사진을 불러오고 있어요</Text></View>
      ) : state.status === "failed" ? (
        <View style={styles.center}>
          <Text accessibilityLiveRegion="polite" style={styles.title}>좋아요 사진을 불러오지 못했어요</Text>
          <Pressable accessibilityRole="button" onPress={() => setRetryKey((value) => value + 1)} style={styles.retryButton}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {state.error ? <Text accessibilityLiveRegion="polite" style={styles.errorCopy}>좋아요를 변경하지 못했어요. 다시 시도해 주세요.</Text> : null}
          {state.photos.length === 0 ? (
            <View style={styles.center}><Text style={styles.title}>아직 좋아요 한 공개 사진이 없어요</Text></View>
          ) : state.photos.map((photo, index) => (
            <View key={photo.id} style={styles.card}>
              <Pressable accessibilityLabel={`${photo.description ?? "공개 사진"} 상세 열기`} accessibilityRole="button" onPress={() => openPhoto(photo.id)}>
                <RecoverableRemoteImage accessibilityLabel={`${photo.description ?? "공개 사진"} 이미지`} onRetry={() => setRetryKey((value) => value + 1)} style={styles.photo} uri={photo.imageUrl} />
                <Text style={styles.description}>{photo.description ?? "여행 사진"}</Text>
                <Text style={styles.date}>{formatPhotoDate(photo.date)}</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`${photo.description ?? "공개 사진"} 좋아요 취소`}
                accessibilityRole="button"
                disabled={state.pendingIds.has(photo.id)}
                onPress={() => void unlike(photo, index)}
                style={styles.unlikeButton}
              >
                <Text style={styles.unlikeText}>좋아요 취소</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default function LikesRoute() {
  const auth = useAuthSession();
  const refreshKey = useContentVisibilityRefreshKey();
  return <LikesScreen refreshKey={refreshKey} signedIn={auth.status === "signed_in"} />;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 16, paddingTop: 18 },
  brand: { color: mobileColors.pine, fontFamily: "Georgia", fontSize: 16, fontWeight: "700" },
  heading: { color: mobileColors.ink, fontSize: 28, fontWeight: "800", marginTop: 3 },
  center: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  title: { color: mobileColors.ink, fontSize: 20, fontWeight: "800", textAlign: "center" },
  retryButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, justifyContent: "center", marginTop: 20, minHeight: 48, paddingHorizontal: 24 },
  retryText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  content: { gap: 14, padding: 16, paddingBottom: 32 },
  errorCopy: { color: "#9b2c2c", fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 10, borderWidth: 1, overflow: "hidden", paddingBottom: 10 },
  photo: { backgroundColor: mobileColors.line, height: 220, width: "100%" },
  description: { color: mobileColors.ink, fontSize: 17, fontWeight: "800", marginTop: 12, paddingHorizontal: 14 },
  date: { color: mobileColors.muted, fontSize: 12, marginTop: 5, paddingHorizontal: 14 },
  unlikeButton: { alignItems: "center", alignSelf: "flex-end", justifyContent: "center", marginRight: 8, marginTop: 4, minHeight: 44, paddingHorizontal: 10 },
  unlikeText: { color: mobileColors.pineDeep, fontSize: 13, fontWeight: "800" }
});
