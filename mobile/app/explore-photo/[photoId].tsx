import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { AccessibilityInfo, Animated, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthSession } from "../../src/auth-session";
import { blockUser, reportPublicPhoto, type ContentReportReason } from "../../src/content-safety-repository";
import { PhotoSafetyControls } from "../../src/PhotoSafetyControls";
import { mobileColors } from "../../src/mobile-theme";
import { exploreRoute, publicProfileRoute } from "../../src/mobile-routes";
import { setPhotoLiked } from "../../src/liked-photo-repository";
import { createPhotoComment, deletePhotoComment, fetchPhotoComments, type PhotoComment } from "../../src/photo-comment-repository";
import { fetchPublicPhotoDetail, type PublicPhotoDetail } from "../../src/public-photo-detail-repository";
import { RecoverableRemoteImage } from "../../src/RecoverableRemoteImage";
import { KeyboardSafeScrollView } from "../../src/KeyboardSafeScrollView";
import { useMobileScreenGutter } from "../../src/mobile-layout";
import { useContentVisibilityRefreshKey } from "../../src/content-visibility-refresh";
import { DefaultProfileAvatar } from "../../src/DefaultProfileAvatar";
import { formatPhotoDate } from "../../src/photo-date";

type PublicPhotoDetailScreenProps = {
  readonly blockAuthor?: (blockerId: string, blockedId: string) => Promise<void>;
  readonly currentUserId?: string | null;
  readonly goBack?: () => void;
  readonly loadComments?: (photoId: string, signal?: AbortSignal) => Promise<PhotoComment[]>;
  readonly loadPhoto?: (photoId: string, signal?: AbortSignal) => Promise<PublicPhotoDetail>;
  readonly openAuthor?: (userId: string) => void;
  readonly openOnMap?: (photo: PublicPhotoDetail) => void;
  readonly openStreetView?: (photo: PublicPhotoDetail) => void | Promise<void>;
  readonly photoId: string | null;
  readonly refreshKey?: number;
  readonly removeComment?: (commentId: number) => Promise<void>;
  readonly reportPhoto?: (photoId: string, reporterId: string, reportedUserId: string, reason: ContentReportReason, details: string) => Promise<void>;
  readonly submitComment?: (photoId: string, authorId: string, text: string) => Promise<PhotoComment>;
  readonly updateLike?: (photoId: string, shouldLike: boolean) => Promise<number>;
};

type DetailState =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly photo: PublicPhotoDetail; readonly likePending: boolean; readonly likeError: boolean };

type CommentsState =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly comments: readonly PhotoComment[]; readonly mutationPending: boolean; readonly mutationError: "create" | "delete" | null };

function precisionCopy(precision: PublicPhotoDetail["locationPrecision"]): string {
  if (precision === "exact") return "정확 위치로 공개됨";
  if (precision === "approximate") return "근사 위치로 공개됨";
  return "위치가 숨겨진 사진";
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { readonly name?: unknown }).name === "AbortError";
}

export function PublicPhotoDetailScreen({
  blockAuthor = blockUser,
  currentUserId = null,
  goBack = router.back,
  loadComments = fetchPhotoComments,
  loadPhoto,
  openAuthor = (userId) => router.push({ pathname: publicProfileRoute, params: { userId } }),
  openOnMap = (photo) => {
    if (photo.location === undefined) return;
    router.push({
      pathname: exploreRoute as never,
      params: {
        focusPhotoId: photo.id,
        lat: String(photo.location.lat),
        lng: String(photo.location.lng),
        scope: currentUserId === photo.owner.id ? "mine" : "others"
      }
    });
  },
  openStreetView = async (photo) => {
    if (photo.location === undefined || photo.locationPrecision !== "exact") return;
    const location = `${photo.location.lat},${photo.location.lng}`;
    await Linking.openURL(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(location)}`);
  },
  photoId,
  refreshKey = 0,
  removeComment = deletePhotoComment,
  reportPhoto = reportPublicPhoto,
  submitComment = createPhotoComment,
  updateLike = setPhotoLiked
}: PublicPhotoDetailScreenProps) {
  const gutter = useMobileScreenGutter();
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const [commentsState, setCommentsState] = useState<CommentsState>({ status: "loading" });
  const [commentsRetryKey, setCommentsRetryKey] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [likeScale] = useState(() => new Animated.Value(1));
  const loadPhotoForViewer = useCallback(
    (id: string, signal?: AbortSignal) => loadPhoto === undefined
      ? fetchPublicPhotoDetail(id, signal, undefined, currentUserId)
      : loadPhoto(id, signal),
    [currentUserId, loadPhoto]
  );

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (mounted) setReduceMotion(enabled); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (photoId === null) return () => controller.abort();
    queueMicrotask(() => { if (!controller.signal.aborted) setState({ status: "loading" }); });
    void loadPhotoForViewer(photoId, controller.signal)
      .then((photo) => { if (!controller.signal.aborted) setState({ status: "ready", photo, likePending: false, likeError: false }); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbortError(error)) setState({ status: "failed" });
      });
    return () => controller.abort();
  }, [loadPhotoForViewer, photoId, refreshKey, retryKey]);

  useEffect(() => {
    const controller = new AbortController();
    if (photoId === null) return () => controller.abort();
    queueMicrotask(() => { if (!controller.signal.aborted) setCommentsState({ status: "loading" }); });
    void loadComments(photoId, controller.signal)
      .then((comments) => { if (!controller.signal.aborted) setCommentsState({ status: "ready", comments, mutationPending: false, mutationError: null }); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbortError(error)) setCommentsState({ status: "failed" });
      });
    return () => controller.abort();
  }, [commentsRetryKey, loadComments, photoId, refreshKey]);

  const displayState: DetailState = photoId === null ? { status: "failed" } : state;

  async function toggleLike() {
    if (state.status !== "ready" || state.likePending) return;
    const previous = state;
    const nextLiked = !previous.photo.viewerHasLiked;
    setState({
      status: "ready",
      photo: { ...previous.photo, viewerHasLiked: nextLiked, liked: Math.max(0, previous.photo.liked + (nextLiked ? 1 : -1)) },
      likePending: true,
      likeError: false
    });
    try {
      const count = await updateLike(previous.photo.id, nextLiked);
      setState((current) => current.status === "ready"
        ? { ...current, photo: { ...current.photo, liked: count }, likePending: false }
        : current);
    } catch {
      setState({ ...previous, likePending: false, likeError: true });
    }
  }

  function animateLike() {
    if (reduceMotion) return;
    likeScale.stopAnimation();
    Animated.sequence([
      Animated.timing(likeScale, { duration: 70, toValue: 0.82, useNativeDriver: true }),
      Animated.spring(likeScale, { friction: 4, tension: 240, toValue: 1.14, useNativeDriver: true }),
      Animated.spring(likeScale, { friction: 6, tension: 180, toValue: 1, useNativeDriver: true })
    ]).start();
  }

  async function addComment() {
    const normalizedText = commentText.trim();
    if (photoId === null || currentUserId === null || commentsState.status !== "ready" || commentsState.mutationPending || normalizedText.length === 0) return;
    const previous = commentsState;
    setCommentsState({ ...previous, mutationPending: true, mutationError: null });
    try {
      const comment = await submitComment(photoId, currentUserId, normalizedText);
      setCommentsState({ status: "ready", comments: [...previous.comments, comment], mutationPending: false, mutationError: null });
      setCommentText("");
    } catch {
      setCommentsState({ ...previous, mutationPending: false, mutationError: "create" });
    }
  }

  async function removeOwnComment(commentId: number) {
    if (commentsState.status !== "ready" || commentsState.mutationPending) return;
    const previous = commentsState;
    setCommentsState({ status: "ready", comments: previous.comments.filter((comment) => comment.id !== commentId), mutationPending: true, mutationError: null });
    try {
      await removeComment(commentId);
      setCommentsState((current) => current.status === "ready" ? { ...current, mutationPending: false } : current);
    } catch {
      setCommentsState({ ...previous, mutationPending: false, mutationError: "delete" });
    }
  }


  function renderComments() {
    return (
      <View style={styles.commentsSection}>
        <Text style={styles.commentsTitle}>댓글</Text>
        {commentsState.status === "loading" ? <Text accessibilityLiveRegion="polite" style={styles.commentsCopy}>댓글을 불러오고 있어요</Text> : null}
        {commentsState.status === "failed" ? (
          <View>
            <Text accessibilityLiveRegion="polite" style={styles.commentsCopy}>댓글을 불러오지 못했어요</Text>
            <Pressable accessibilityLabel="댓글 다시 시도" accessibilityRole="button" onPress={() => {
              setCommentsState({ status: "loading" });
              setCommentsRetryKey((value) => value + 1);
            }} style={styles.commentRetryButton}>
              <Text style={styles.commentRetryText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : null}
        {commentsState.status === "ready" ? (
          <View style={styles.commentList}>
            {commentsState.comments.length === 0 ? <Text style={styles.commentsCopy}>첫 댓글을 남겨보세요.</Text> : null}
            {commentsState.comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{comment.author.displayName}</Text>
                  {comment.author.id === currentUserId ? (
                    <Pressable accessibilityLabel={`댓글 ${comment.id} 삭제`} accessibilityRole="button" disabled={commentsState.mutationPending} onPress={() => void removeOwnComment(comment.id)}>
                      <Text style={styles.commentDelete}>삭제</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.commentBody}>{comment.text}</Text>
              </View>
            ))}
            {commentsState.mutationError === "delete" ? <Text accessibilityLiveRegion="polite" style={styles.commentError}>댓글을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.</Text> : null}
            {commentsState.mutationError === "create" ? <Text accessibilityLiveRegion="polite" style={styles.commentError}>댓글을 작성하지 못했어요. 잠시 후 다시 시도해 주세요.</Text> : null}
          </View>
        ) : null}
        {currentUserId === null ? <Text style={styles.loginCopy}>로그인하면 댓글을 남길 수 있어요.</Text> : (
          <View style={styles.commentComposer}>
            <TextInput
              accessibilityLabel="댓글 내용"
              editable={commentsState.status === "ready" && !commentsState.mutationPending}
              maxLength={1000}
              multiline
              onChangeText={setCommentText}
              placeholder="여행의 감상을 남겨주세요"
              placeholderTextColor={mobileColors.muted}
              style={styles.commentInput}
              value={commentText}
            />
            <View style={styles.composerFooter}>
              <Text style={styles.characterCount}>{commentText.length}/1000</Text>
              <Pressable accessibilityLabel="댓글 작성" accessibilityRole="button" disabled={commentsState.status !== "ready" || commentsState.mutationPending || commentText.trim().length === 0} onPress={() => void addComment()} style={styles.commentSubmit}>
                <Text style={styles.commentSubmitText}>작성</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Explore로 돌아가기" accessibilityRole="button" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.brand}>Ikkyee</Text>
          <Text style={styles.heading}>사진 상세</Text>
        </View>
      </View>
      {displayState.status === "loading" ? (
        <View style={styles.center}><Text accessibilityLiveRegion="polite" style={styles.title}>사진을 불러오고 있어요</Text></View>
      ) : displayState.status === "failed" ? (
        <View style={styles.center}>
          <Text accessibilityLiveRegion="polite" style={styles.title}>사진을 열 수 없어요</Text>
          <Text style={styles.copy}>삭제되었거나 더 이상 공개되지 않는 사진일 수 있습니다.</Text>
          <Pressable accessibilityRole="button" onPress={() => setRetryKey((value) => value + 1)} style={styles.retryButton}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardSafeScrollView contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}>
          <View style={styles.photoFrame}>
            <RecoverableRemoteImage accessibilityLabel="여행 사진" onRetry={() => setRetryKey((value) => value + 1)} style={styles.photo} uri={displayState.photo.imageUrl} />
            <View accessible={false} style={styles.scrollCue}><Text style={styles.scrollCueText}>⌄</Text></View>
          </View>
          <Pressable
            accessibilityLabel={`${displayState.photo.owner.displayName} 프로필 열기`}
            accessibilityRole="button"
            onPress={() => openAuthor(displayState.photo.owner.id)}
            style={styles.authorRow}
          >
            {displayState.photo.owner.avatarUrl === null ? (
              <DefaultProfileAvatar size={40} />
            ) : <Image accessibilityLabel="작성자 프로필 이미지" source={{ uri: displayState.photo.owner.avatarUrl }} style={styles.avatar} />}
            <Text style={styles.authorName}>{displayState.photo.owner.displayName}</Text>
          </Pressable>
          <View style={styles.titleRow}>
            <Text style={styles.description}>{displayState.photo.description ?? "여행의 순간"}</Text>
            {currentUserId !== null && currentUserId !== displayState.photo.owner.id ? (
              <Pressable accessibilityLabel="사진 메뉴" accessibilityRole="button" onPress={() => setActionsOpen((open) => !open)} style={styles.menuButton}>
                <Text style={styles.menuText}>•••</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{formatPhotoDate(displayState.photo.date)} · 좋아요 {displayState.photo.liked}</Text>
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Pressable
                accessibilityLabel={displayState.photo.viewerHasLiked ? "좋아요 취소" : "좋아요"}
                accessibilityRole="button"
                disabled={displayState.likePending}
                onPress={() => { animateLike(); void toggleLike(); }}
                style={[styles.likeButton, displayState.photo.viewerHasLiked && styles.likedButton]}
              >
                <Text style={[styles.likeText, displayState.photo.viewerHasLiked && styles.likedText]}>{displayState.photo.viewerHasLiked ? "♥" : "♡"}</Text>
              </Pressable>
            </Animated.View>
          </View>
          {displayState.likeError ? <Text accessibilityLiveRegion="polite" style={styles.likeError}>좋아요를 변경하지 못했어요. 로그인 상태를 확인해 주세요.</Text> : null}
          {displayState.photo.location === undefined ? null : (
            <View style={styles.locationActions}>
              <Pressable accessibilityLabel="Explore 지도에서 보기" accessibilityRole="button" onPress={() => openOnMap(displayState.photo)} style={styles.locationButton}>
                <Text style={styles.locationButtonText}>Explore 지도에서 보기</Text>
              </Pressable>
              {displayState.photo.locationPrecision === "exact" ? (
                <Pressable accessibilityLabel="거리뷰 열기" accessibilityRole="button" onPress={() => void openStreetView(displayState.photo)} style={styles.locationButton}>
                  <Text style={styles.locationButtonText}>거리뷰</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          {currentUserId === displayState.photo.owner.id ? (
            <View style={styles.privacyCard}>
              <Text style={styles.privacyTitle}>{displayState.photo.visibility === "private" ? "비공개" : displayState.photo.visibility === "link" ? "링크 공개" : "공개"} · {precisionCopy(displayState.photo.locationPrecision)}</Text>
            </View>
          ) : null}
          {actionsOpen ? <PhotoSafetyControls blockAuthor={blockAuthor} currentUserId={currentUserId} onBlocked={goBack} ownerId={displayState.photo.owner.id} photoId={displayState.photo.id} reportPhoto={reportPhoto} /> : null}
          {renderComments()}
        </KeyboardSafeScrollView>
      )}
    </SafeAreaView>
  );
}

export default function PublicPhotoDetailRoute() {
  const params = useLocalSearchParams<{ readonly photoId?: string | string[] }>();
  const auth = useAuthSession();
  const refreshKey = useContentVisibilityRefreshKey();
  return <PublicPhotoDetailScreen currentUserId={auth.user?.id ?? null} photoId={typeof params.photoId === "string" ? params.photoId : null} refreshKey={refreshKey} />;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  header: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 72, paddingHorizontal: 16 },
  backButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  backText: { color: mobileColors.ink, fontSize: 31, lineHeight: 34, marginTop: -3 },
  brand: { color: mobileColors.pine, fontFamily: "Georgia", fontSize: 13, fontWeight: "700" },
  heading: { color: mobileColors.ink, fontSize: 21, fontWeight: "800", marginTop: 2 },
  center: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  title: { color: mobileColors.ink, fontSize: 21, fontWeight: "800", textAlign: "center" },
  copy: { color: mobileColors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, textAlign: "center" },
  retryButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, justifyContent: "center", marginTop: 20, minHeight: 48, paddingHorizontal: 24 },
  retryText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  content: { paddingBottom: 40, paddingTop: 20 },
  photoFrame: { position: "relative" },
  photo: { backgroundColor: mobileColors.line, borderRadius: 8, height: 440, width: "100%" },
  scrollCue: { alignItems: "center", backgroundColor: "rgba(0,54,55,0.72)", borderRadius: 14, bottom: 12, height: 28, justifyContent: "center", left: "50%", marginLeft: -14, position: "absolute", width: 28 },
  scrollCueText: { color: mobileColors.surface, fontSize: 21, lineHeight: 22, marginTop: -3 },
  authorRow: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 18 },
  avatar: { borderRadius: 20, height: 40, width: 40 },
  authorName: { color: mobileColors.ink, fontSize: 15, fontWeight: "800" },
  titleRow: { alignItems: "flex-start", flexDirection: "row", gap: 8, marginTop: 18 },
  description: { color: mobileColors.ink, flex: 1, fontSize: 20, fontWeight: "800", lineHeight: 28 },
  menuButton: { alignItems: "center", height: 44, justifyContent: "center", marginTop: -8, width: 44 },
  menuText: { color: mobileColors.ink, fontSize: 17, fontWeight: "800", letterSpacing: 0 },
  metaRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  meta: { color: mobileColors.muted, fontSize: 13 },
  likeButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  likedButton: { backgroundColor: mobileColors.pineDeep },
  likeText: { color: mobileColors.pineDeep, fontSize: 25, fontWeight: "800", lineHeight: 28 },
  likedText: { color: mobileColors.surface },
  likeError: { color: "#9b2c2c", fontSize: 13, lineHeight: 19, marginTop: 10 },
  privacyCard: { backgroundColor: "#e1eadb", borderRadius: 8, marginTop: 20, padding: 16 },
  privacyTitle: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  locationActions: { flexDirection: "row", gap: 8, marginTop: 16 },
  locationButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 46, paddingHorizontal: 10 },
  locationButtonText: { color: mobileColors.pineDeep, fontSize: 13, fontWeight: "800", textAlign: "center" },
  commentsSection: { borderTopColor: mobileColors.line, borderTopWidth: 1, marginTop: 28, paddingTop: 24 },
  commentsTitle: { color: mobileColors.ink, fontSize: 19, fontWeight: "800" },
  commentsCopy: { color: mobileColors.muted, fontSize: 14, lineHeight: 21, marginTop: 12 },
  commentRetryButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, marginTop: 12, minHeight: 44, justifyContent: "center" },
  commentRetryText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  commentList: { gap: 10, marginTop: 12 },
  commentCard: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, padding: 14 },
  commentHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  commentAuthor: { color: mobileColors.ink, fontSize: 13, fontWeight: "800" },
  commentDelete: { color: "#9b2c2c", fontSize: 12, fontWeight: "700", padding: 6 },
  commentBody: { color: mobileColors.ink, fontSize: 14, lineHeight: 21, marginTop: 6 },
  commentError: { color: "#9b2c2c", fontSize: 13, lineHeight: 19 },
  loginCopy: { color: mobileColors.muted, fontSize: 13, marginTop: 16 },
  commentComposer: { marginTop: 16 },
  commentInput: { borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, color: mobileColors.ink, fontSize: 14, minHeight: 88, padding: 12, textAlignVertical: "top" },
  composerFooter: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  characterCount: { color: mobileColors.muted, fontSize: 12 },
  commentSubmit: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 8, justifyContent: "center", minHeight: 44, minWidth: 72 },
  commentSubmitText: { color: mobileColors.surface, fontSize: 14, fontWeight: "800" }
});
