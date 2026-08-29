import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mobileColors } from "../../src/mobile-theme";
import { publicPhotoDetailRoute } from "../../src/mobile-routes";
import { fetchPublicProfile, type PublicProfile } from "../../src/public-profile-repository";
import { RecoverableRemoteImage } from "../../src/RecoverableRemoteImage";
import { useContentVisibilityRefreshKey } from "../../src/content-visibility-refresh";
import { DefaultProfileAvatar } from "../../src/DefaultProfileAvatar";

type PublicProfileScreenProps = {
  readonly goBack?: () => void;
  readonly loadProfile?: (userId: string, signal?: AbortSignal) => Promise<PublicProfile>;
  readonly openPhoto?: (photoId: string) => void;
  readonly refreshKey?: number;
  readonly userId: string | null;
};

type ProfileState =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly profile: PublicProfile };

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { readonly name?: unknown }).name === "AbortError";
}

export function PublicProfileScreen({
  goBack = router.back,
  loadProfile = fetchPublicProfile,
  openPhoto = (photoId) => router.push({ pathname: publicPhotoDetailRoute, params: { photoId } }),
  refreshKey = 0,
  userId
}: PublicProfileScreenProps) {
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    if (userId === null) return () => controller.abort();
    queueMicrotask(() => { if (!controller.signal.aborted) setState({ status: "loading" }); });
    void loadProfile(userId, controller.signal)
      .then((profile) => { if (!controller.signal.aborted) setState({ status: "ready", profile }); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbortError(error)) setState({ status: "failed" });
      });
    return () => controller.abort();
  }, [loadProfile, refreshKey, retryKey, userId]);

  const displayState: ProfileState = userId === null ? { status: "failed" } : state;
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="공개 사진으로 돌아가기" accessibilityRole="button" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.heading}>여행자 프로필</Text>
      </View>
      {displayState.status === "loading" ? (
        <View style={styles.center}><Text accessibilityLiveRegion="polite" style={styles.title}>프로필을 불러오고 있어요</Text></View>
      ) : displayState.status === "failed" ? (
        <View style={styles.center}>
          <Text accessibilityLiveRegion="polite" style={styles.title}>공개 프로필을 열 수 없어요</Text>
          <Pressable accessibilityRole="button" onPress={() => setRetryKey((value) => value + 1)} style={styles.retryButton}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {displayState.profile.avatarUrl === null ? (
            <DefaultProfileAvatar size={96} />
          ) : <Image accessibilityLabel="여행자 프로필 이미지" source={{ uri: displayState.profile.avatarUrl }} style={styles.avatar} />}
          <Text style={styles.name}>{displayState.profile.displayName}</Text>
          {displayState.profile.bio.length === 0 ? null : <Text style={styles.bio}>{displayState.profile.bio}</Text>}
          <Text style={styles.sectionTitle}>공개 사진 {displayState.profile.photos.length}장</Text>
          {displayState.profile.photos.length === 0 ? (
            <Text style={styles.emptyCopy}>아직 공개한 사진이 없습니다.</Text>
          ) : (
            <View style={styles.grid}>
              {displayState.profile.photos.map((photo) => (
                <Pressable accessibilityLabel={photo.description ?? "공개 여행 사진"} accessibilityRole="button" key={photo.id} onPress={() => openPhoto(photo.id)} style={styles.photoButton}>
                  <RecoverableRemoteImage accessibilityLabel={`${photo.description ?? "공개 여행 사진"} 이미지`} onRetry={() => setRetryKey((value) => value + 1)} style={styles.photo} uri={photo.imageUrl} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default function PublicProfileRoute() {
  const params = useLocalSearchParams<{ readonly userId?: string | string[] }>();
  const refreshKey = useContentVisibilityRefreshKey();
  return <PublicProfileScreen refreshKey={refreshKey} userId={typeof params.userId === "string" ? params.userId : null} />;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  header: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 72, paddingHorizontal: 16 },
  backButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  backText: { color: mobileColors.ink, fontSize: 31, lineHeight: 34, marginTop: -3 },
  heading: { color: mobileColors.ink, fontSize: 21, fontWeight: "800" },
  center: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  title: { color: mobileColors.ink, fontSize: 21, fontWeight: "800", textAlign: "center" },
  retryButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, justifyContent: "center", marginTop: 20, minHeight: 48, paddingHorizontal: 24 },
  retryText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  content: { alignItems: "center", padding: 20, paddingBottom: 40 },
  avatar: { borderRadius: 48, height: 96, width: 96 },
  name: { color: mobileColors.ink, fontSize: 24, fontWeight: "800", marginTop: 14 },
  bio: { color: mobileColors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 420, textAlign: "center" },
  sectionTitle: { alignSelf: "flex-start", color: mobileColors.ink, fontSize: 17, fontWeight: "800", marginTop: 28 },
  emptyCopy: { alignSelf: "flex-start", color: mobileColors.muted, fontSize: 14, marginTop: 12 },
  grid: { alignSelf: "stretch", flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 12 },
  photoButton: { aspectRatio: 1, width: "32%" },
  photo: { backgroundColor: mobileColors.line, borderRadius: 4, height: "100%", width: "100%" }
});
