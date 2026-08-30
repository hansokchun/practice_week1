import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchOwnedAlbumDetail, type MobileAlbumDetail, type MobileAlbumPhoto } from "./album-repository";
import { mobileColors } from "./mobile-theme";
import { RecoverableRemoteImage } from "./RecoverableRemoteImage";

type AlbumDetailScreenProps = {
  readonly albumId: string;
  readonly ownerId: string | null;
  readonly loadAlbum?: (albumId: string, ownerId: string) => Promise<MobileAlbumDetail>;
  readonly openPhoto?: (photoId: string) => void;
  readonly goBack?: () => void;
};

const visibilityLabels = { private: "비공개", link: "링크 공유", public: "공개" } as const;

function photoLabel(photo: MobileAlbumPhoto): string {
  return photo.description?.trim() || photo.title?.trim() || "여행 사진";
}

export function AlbumDetailScreen({
  albumId,
  ownerId,
  loadAlbum = fetchOwnedAlbumDetail,
  openPhoto = () => {},
  goBack = () => {}
}: AlbumDetailScreenProps) {
  const [album, setAlbum] = useState<MobileAlbumDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    if (ownerId === null) {
      queueMicrotask(() => { if (mounted) setFailed(true); });
      return () => { mounted = false; };
    }
    void loadAlbum(albumId, ownerId).then((value) => {
      if (mounted) setAlbum(value);
    }).catch(() => {
      if (mounted) setFailed(true);
    });
    return () => { mounted = false; };
  }, [albumId, loadAlbum, ownerId, reloadKey]);

  function retry() {
    setFailed(false);
    setAlbum(null);
    setReloadKey((value) => value + 1);
  }

  return (
    <SafeAreaView style={styles.safeArea} testID="album-detail-screen">
      <View style={styles.header}>
        <Pressable accessibilityLabel="앨범 목록으로 돌아가기" accessibilityRole="button" onPress={goBack} style={styles.backButton}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.brand}>Ikkyee</Text><View style={styles.headerSpacer} />
      </View>
      {failed ? (
        <View style={styles.statusBody}><Text style={styles.statusText}>앨범을 불러오지 못했어요.</Text><Pressable accessibilityLabel="앨범 상세 다시 불러오기" accessibilityRole="button" onPress={retry} style={styles.retryButton}><Text style={styles.retryText}>다시 시도</Text></Pressable></View>
      ) : album === null ? <Text style={styles.statusText}>앨범을 불러오고 있어요</Text> : (
        <FlatList
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          data={album.photos}
          keyExtractor={(photo) => photo.id}
          ListEmptyComponent={<Text style={styles.statusText}>이 앨범에 사진이 아직 없어요.</Text>}
          ListHeaderComponent={<View style={styles.intro}><Text style={styles.title}>{album.title}</Text><Text style={styles.meta}>{visibilityLabels[album.visibility]} · {album.photoCount}장</Text>{album.note.length > 0 ? <Text style={styles.note}>{album.note}</Text> : null}</View>}
          numColumns={2}
          renderItem={({ item }) => {
            const label = photoLabel(item);
            return <Pressable accessibilityLabel={`${label} 상세 보기`} accessibilityRole="button" onPress={() => openPhoto(item.id)} style={styles.photoTile}><RecoverableRemoteImage accessibilityLabel={label} onRetry={() => setReloadKey((value) => value + 1)} style={styles.photo} uri={item.imageUrl} /></Pressable>;
          }}
        />
      )}
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
  intro: { paddingBottom: 28, paddingHorizontal: 4, paddingTop: 20 },
  title: { color: mobileColors.ink, fontSize: 30, fontWeight: "900" },
  meta: { color: mobileColors.muted, fontSize: 13, fontWeight: "700", marginTop: 10 },
  note: { color: mobileColors.ink, fontSize: 15, lineHeight: 23, marginTop: 20 },
  grid: { paddingBottom: 48, paddingHorizontal: 16 },
  row: { gap: 12, marginBottom: 12 },
  photoTile: { aspectRatio: 0.8, borderRadius: 6, flex: 1, minWidth: 0, overflow: "hidden" },
  photo: { backgroundColor: "#edf1eb", height: "100%", width: "100%" },
  statusBody: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  statusText: { color: mobileColors.muted, fontSize: 14, padding: 32, textAlign: "center" },
  retryButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 18 },
  retryText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" }
});
