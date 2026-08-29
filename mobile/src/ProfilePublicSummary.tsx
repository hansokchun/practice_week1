import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { publicPhotoDetailRoute } from "./mobile-routes";
import { mobileColors } from "./mobile-theme";
import { RecoverableRemoteImage } from "./RecoverableRemoteImage";
import { fetchPublicProfile, type PublicProfile } from "./public-profile-repository";

type ProfilePublicSummaryProps = {
  readonly userId: string;
  readonly loadProfile?: (userId: string, signal?: AbortSignal) => Promise<PublicProfile>;
  readonly openPhoto?: (photoId: string) => void;
  readonly refreshKey?: number;
};

type SummaryState =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly profile: PublicProfile };

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { readonly name?: unknown }).name === "AbortError";
}

export function ProfilePublicSummary({
  userId,
  loadProfile = fetchPublicProfile,
  openPhoto = (photoId) => router.push({ pathname: publicPhotoDetailRoute, params: { photoId } }),
  refreshKey = 0
}: ProfilePublicSummaryProps) {
  const [state, setState] = useState<SummaryState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) setState({ status: "loading" }); });
    void loadProfile(userId, controller.signal)
      .then((profile) => { if (!controller.signal.aborted) setState({ status: "ready", profile }); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbortError(error)) setState({ status: "failed" });
      });
    return () => controller.abort();
  }, [loadProfile, refreshKey, retryKey, userId]);

  return <View style={styles.section}>
    <Text style={styles.title}>공개 사진</Text>
    {state.status === "loading" ? <Text accessibilityLiveRegion="polite" style={styles.copy}>공개 사진을 불러오고 있어요.</Text> : null}
    {state.status === "failed" ? <View>
      <Text accessibilityLiveRegion="polite" style={styles.copy}>공개 사진 요약을 불러오지 못했어요.</Text>
      <Pressable accessibilityLabel="공개 사진 요약 다시 시도" accessibilityRole="button" onPress={() => { setState({ status: "loading" }); setRetryKey((value) => value + 1); }} style={styles.retryButton}><Text style={styles.retryText}>다시 시도</Text></Pressable>
    </View> : null}
    {state.status === "ready" ? <View>
      <Text style={styles.count}>최근 공개 사진 {state.profile.photos.length}장</Text>
      {state.profile.photos.length === 0 ? <Text style={styles.copy}>아직 공개한 사진이 없습니다.</Text> : <View style={styles.grid}>
        {state.profile.photos.slice(0, 6).map((photo) => <Pressable accessibilityLabel={`${photo.description ?? "공개 여행 사진"} 공개 사진 열기`} accessibilityRole="button" key={photo.id} onPress={() => openPhoto(photo.id)} style={styles.photoButton}>
          <RecoverableRemoteImage accessibilityLabel={`${photo.description ?? "공개 여행 사진"} 이미지`} onRetry={() => setRetryKey((value) => value + 1)} style={styles.photo} uri={photo.imageUrl} />
        </Pressable>)}
      </View>}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { alignSelf: "stretch", borderTopColor: mobileColors.line, borderTopWidth: 1, marginTop: 28, paddingTop: 20 },
  title: { color: mobileColors.ink, fontSize: 17, fontWeight: "800" },
  count: { color: mobileColors.muted, fontSize: 13, marginTop: 8 },
  copy: { color: mobileColors.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 12 },
  photoButton: { aspectRatio: 1, width: "32%" },
  photo: { backgroundColor: mobileColors.line, borderRadius: 4, height: "100%", width: "100%" },
  retryButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, justifyContent: "center", marginTop: 12, minHeight: 44 },
  retryText: { color: mobileColors.pineDeep, fontSize: 13, fontWeight: "800" }
});
