import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchOwnedAlbums, type MobileAlbum } from "./album-repository";
import { mobileColors } from "./mobile-theme";
import { RecoverableRemoteImage } from "./RecoverableRemoteImage";

type MyAlbumsScreenProps = {
  readonly ownerId: string | null;
  readonly loadAlbums?: (ownerId: string) => Promise<readonly MobileAlbum[]>;
  readonly openAlbum?: (albumId: string) => void;
  readonly goToPhotos?: () => void;
};

type AlbumState =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly albums: readonly MobileAlbum[] };

function formatDate(value: string | null): string {
  return value === null ? "" : value.replace(/-/gu, ".");
}

export function MyAlbumsScreen({
  ownerId,
  loadAlbums = fetchOwnedAlbums,
  openAlbum = () => {},
  goToPhotos = () => {}
}: MyAlbumsScreenProps) {
  const [state, setState] = useState<AlbumState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    if (ownerId === null) {
      queueMicrotask(() => { if (mounted) setState({ status: "failed" }); });
      return () => { mounted = false; };
    }
    void loadAlbums(ownerId).then((albums) => {
      if (mounted) setState({ status: "ready", albums });
    }).catch(() => {
      if (mounted) setState({ status: "failed" });
    });
    return () => { mounted = false; };
  }, [loadAlbums, ownerId, reloadKey]);

  const albums = state.status === "ready" ? state.albums : [];
  return (
    <SafeAreaView style={styles.safeArea} testID="my-albums-screen">
      <View style={styles.header}>
        <Text style={styles.brand}>Ikkyee</Text>
        <Text style={styles.title}>내 사진</Text>
      </View>
      <View style={styles.tabs}>
        <Pressable accessibilityLabel="사진 보기" accessibilityRole="button" onPress={goToPhotos} style={styles.tab}><Text style={styles.tabText}>사진</Text></Pressable>
        <View accessibilityLabel="앨범 보기" style={[styles.tab, styles.tabActive]}><Text style={[styles.tabText, styles.tabTextActive]}>앨범</Text></View>
      </View>
      <Text style={styles.description}>웹에서 만든 앨범을 안전하게 둘러보세요.</Text>
      {state.status === "loading" ? <Text style={styles.status}>앨범을 불러오고 있어요</Text> : null}
      {state.status === "failed" ? (
        <View style={styles.statusBody}>
          <Text style={styles.status}>앨범을 불러오지 못했어요.</Text>
          <Pressable accessibilityLabel="앨범 다시 불러오기" accessibilityRole="button" onPress={() => setReloadKey((value) => value + 1)} style={styles.retryButton}><Text style={styles.retryText}>다시 시도</Text></Pressable>
        </View>
      ) : null}
      {state.status === "ready" ? (
        <FlatList
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          data={albums}
          keyExtractor={(album) => album.id}
          ListEmptyComponent={<Text style={styles.status}>아직 만든 앨범이 없어요.</Text>}
          numColumns={2}
          renderItem={({ item }) => {
            const dates = [formatDate(item.dateStart), formatDate(item.dateEnd)].filter(Boolean).join(" - ");
            return (
              <Pressable accessibilityLabel={`${item.title} 앨범 열기`} accessibilityRole="button" onPress={() => openAlbum(item.id)} style={styles.albumCard}>
                {item.coverImageUrl === null ? <View style={styles.coverPlaceholder}><Text style={styles.coverPlaceholderText}>Ikkyee</Text></View> : (
                  <RecoverableRemoteImage accessibilityLabel={`${item.title} 표지`} onRetry={() => setReloadKey((value) => value + 1)} style={styles.cover} uri={item.coverImageUrl} />
                )}
                <Text numberOfLines={1} style={styles.albumTitle}>{item.title}</Text>
                <Text style={styles.albumMeta}>{item.photoCount}장{dates.length > 0 ? ` · ${dates}` : ""}</Text>
              </Pressable>
            );
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  brand: { color: mobileColors.pine, fontFamily: "Georgia", fontSize: 15, fontWeight: "800" },
  title: { color: mobileColors.ink, fontSize: 28, fontWeight: "900", marginTop: 4 },
  tabs: { alignSelf: "flex-start", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, flexDirection: "row", marginHorizontal: 16, marginTop: 18, padding: 3 },
  tab: { alignItems: "center", borderRadius: 6, justifyContent: "center", minHeight: 40, minWidth: 76, paddingHorizontal: 14 },
  tabActive: { backgroundColor: mobileColors.pineDeep },
  tabText: { color: mobileColors.muted, fontSize: 13, fontWeight: "800" },
  tabTextActive: { color: mobileColors.surface },
  description: { color: mobileColors.muted, fontSize: 13, lineHeight: 19, paddingHorizontal: 16, paddingVertical: 16 },
  grid: { padding: 16 },
  row: { gap: 12 },
  albumCard: { flex: 1, marginBottom: 24, minWidth: 0 },
  cover: { aspectRatio: 1, backgroundColor: "#edf1eb", borderRadius: 6, width: "100%" },
  coverPlaceholder: { alignItems: "center", aspectRatio: 1, backgroundColor: "#e4ebe5", borderRadius: 6, justifyContent: "center", width: "100%" },
  coverPlaceholderText: { color: mobileColors.pine, fontFamily: "Georgia", fontSize: 18, fontWeight: "800" },
  albumTitle: { color: mobileColors.ink, fontSize: 15, fontWeight: "800", marginTop: 9 },
  albumMeta: { color: mobileColors.muted, fontSize: 12, marginTop: 4 },
  statusBody: { alignItems: "center", padding: 32 },
  status: { color: mobileColors.muted, fontSize: 14, padding: 28, textAlign: "center" },
  retryButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 18 },
  retryText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" }
});
