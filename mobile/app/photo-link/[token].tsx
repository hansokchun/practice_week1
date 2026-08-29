import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mobileColors } from "../../src/mobile-theme";
import { fetchLinkedPhoto, PhotoLinkLoadError, type LinkedPhoto } from "../../src/photo-link-client";
import { RecoverableRemoteImage } from "../../src/RecoverableRemoteImage";
import { useContentVisibilityRefreshKey } from "../../src/content-visibility-refresh";

type PhotoLinkScreenProps = {
  readonly loadPhoto?: (token: string) => Promise<LinkedPhoto>;
  readonly refreshKey?: number;
  readonly token: string | null;
};

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly kind: "retryable" | "unavailable" }
  | { readonly status: "ready"; readonly photo: LinkedPhoto };

export function PhotoLinkScreen({ loadPhoto = fetchLinkedPhoto, refreshKey = 0, token }: PhotoLinkScreenProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    if (token === null) {
      return () => { active = false; };
    }
    queueMicrotask(() => { if (active) setState({ status: "loading" }); });
    void loadPhoto(token)
      .then((photo) => { if (active) setState({ status: "ready", photo }); })
      .catch((error: unknown) => {
        if (active) setState({
          status: "failed",
          kind: error instanceof PhotoLinkLoadError ? error.kind : "unavailable"
        });
      });
    return () => { active = false; };
  }, [loadPhoto, refreshKey, retryKey, token]);

  const displayState: LoadState = token === null ? { status: "failed", kind: "unavailable" } : state;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.brand}>Ikkyee</Text>
        <Text style={styles.eyebrow}>비공개 링크 공유</Text>
      </View>
      {displayState.status === "loading" ? (
        <View style={styles.center}>
          <Text accessibilityLiveRegion="polite" style={styles.title}>공유 사진을 불러오고 있어요</Text>
        </View>
      ) : displayState.status === "failed" ? (
        <View style={styles.center}>
          <Text accessibilityLiveRegion="polite" style={styles.title}>{displayState.kind === "retryable"
            ? "네트워크 연결을 확인해 주세요"
            : "공유 사진을 열 수 없어요"}</Text>
          <Text style={styles.copy}>{displayState.kind === "retryable"
            ? "연결이 복구되면 다시 시도할 수 있습니다."
            : "링크가 잘못되었거나 더 이상 사용할 수 없습니다."}</Text>
          {displayState.kind === "retryable" ? (
            <Pressable
              accessibilityLabel="공유 사진 다시 시도"
              accessibilityRole="button"
              onPress={() => setRetryKey((value) => value + 1)}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.content}>
          <RecoverableRemoteImage accessibilityLabel="공유받은 여행 사진" onRetry={() => setRetryKey((value) => value + 1)} style={styles.photo} uri={displayState.photo.imageUrl} />
          {displayState.photo.description === null || displayState.photo.description.length === 0
            ? null
            : <Text style={styles.description}>{displayState.photo.description}</Text>}
          {displayState.photo.date === null ? null : <Text style={styles.date}>{displayState.photo.date}</Text>}
          <Text style={styles.notice}>링크를 받은 사람만 볼 수 있는 사진입니다.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function PhotoLinkRoute() {
  const params = useLocalSearchParams<{ readonly token?: string | string[] }>();
  const token = typeof params.token === "string" ? params.token : null;
  const refreshKey = useContentVisibilityRefreshKey();
  return <PhotoLinkScreen refreshKey={refreshKey} token={token} />;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12 },
  brand: { color: mobileColors.pine, fontFamily: "Georgia", fontSize: 20, fontWeight: "700" },
  eyebrow: { color: mobileColors.muted, fontSize: 12, fontWeight: "700", marginTop: 4 },
  center: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  title: { color: mobileColors.ink, fontSize: 21, fontWeight: "800", textAlign: "center" },
  copy: { color: mobileColors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, textAlign: "center" },
  retryButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, justifyContent: "center", marginTop: 20, minHeight: 48, paddingHorizontal: 24 },
  retryText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  content: { flex: 1, padding: 20 },
  photo: { backgroundColor: mobileColors.line, borderRadius: 10, flex: 1, maxHeight: 560, width: "100%" },
  description: { color: mobileColors.ink, fontSize: 18, fontWeight: "700", lineHeight: 26, marginTop: 18 },
  date: { color: mobileColors.muted, fontSize: 13, marginTop: 7 },
  notice: { color: mobileColors.pine, fontSize: 12, fontWeight: "700", marginTop: 18 }
});
