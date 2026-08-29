import { useRef, useState } from "react";
import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mobileColors } from "../../src/mobile-theme";
import {
  parsePublicationReviewParams,
  type PublicationIntent,
  type PublicationSelection
} from "../../src/publication-selection";
import { publicationDerivativeRuntime } from "../../src/publication-derivative-runtime";
import type { PublicationDerivative } from "../../src/publication-derivative";
import type { PublicationResult } from "../../src/publication-publisher";
import { publicationRuntime } from "../../src/publication-runtime";
import { useAuthSession } from "../../src/auth-session";
import { buildMobilePhotoShareUrl } from "../../src/publication-link-token";

type PublicationReviewScreenProps = {
  readonly goBack?: () => void;
  readonly prepareDerivatives?: (assetIds: readonly string[]) => Promise<readonly PublicationDerivative[]>;
  readonly removeDerivative?: (uri: string) => Promise<void>;
  readonly publish?: (selection: PublicationSelection, derivatives: readonly PublicationDerivative[]) => Promise<PublicationResult>;
  readonly selection: PublicationSelection | null;
  readonly shareLink?: (token: string) => Promise<void>;
};

type PreparationState =
  | { readonly status: "idle" | "preparing" | "failed" }
  | { readonly status: "ready"; readonly derivatives: readonly PublicationDerivative[] };

type PublicationState =
  | { readonly status: "idle" | "uploading" }
  | { readonly status: "succeeded"; readonly count: number; readonly shareTokens: readonly string[] }
  | { readonly status: "failed"; readonly count: number; readonly retryable: boolean };

function intentCopy(intent: PublicationIntent): {
  readonly title: string;
  readonly destination: string;
  readonly description: string;
} {
  if (intent === "private") return {
    title: "비공개 저장 준비",
    destination: "나만 보는 클라우드 저장",
    description: "로그인한 계정만 접근할 수 있도록 준비합니다."
  };
  if (intent === "link") return {
    title: "링크 공유 준비",
    destination: "링크를 받은 사람에게 공유",
    description: "공개 Explore에는 표시하지 않는 공유 방식입니다."
  };
  return {
    title: "공개 게시 준비",
    destination: "Explore 공개 게시",
    description: "게시 후 다른 사용자가 사진을 볼 수 있는 방식입니다."
  };
}

export function PublicationReviewScreen({
  goBack = router.back,
  prepareDerivatives = publicationDerivativeRuntime.prepare,
  removeDerivative = publicationDerivativeRuntime.remove,
  publish,
  selection,
  shareLink = async (token) => {
    await Share.share({
      message: buildMobilePhotoShareUrl(token, Constants.expoConfig?.extra?.["publicLinkOrigin"])
    });
  }
}: PublicationReviewScreenProps) {
  const [preparation, setPreparation] = useState<PreparationState>({ status: "idle" });
  const [publication, setPublication] = useState<PublicationState>({ status: "idle" });
  const cancelledRef = useRef(false);
  const uploadLockRef = useRef(false);

  if (selection === null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header goBack={goBack} />
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>선택한 사진을 확인할 수 없어요</Text>
          <Text style={styles.emptyCopy}>내 사진으로 돌아가 게시할 사진과 방식을 다시 선택해 주세요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const copy = intentCopy(selection.intent);

  async function prepare() {
    if (selection === null || preparation.status === "preparing") return;
    setPreparation({ status: "preparing" });
    cancelledRef.current = false;
    try {
      const derivatives = await prepareDerivatives(selection.assetIds);
      if (cancelledRef.current) {
        await Promise.allSettled(derivatives.map((derivative) => removeDerivative(derivative.uri)));
        return;
      }
      setPreparation({ status: "ready", derivatives });
    } catch (cause) {
      void cause;
      setPreparation({ status: "failed" });
    }
  }

  async function upload() {
    if (selection === null || preparation.status !== "ready" || publication.status === "uploading" ||
      publish === undefined || uploadLockRef.current) return;
    uploadLockRef.current = true;
    setPublication({ status: "uploading" });
    try {
      const result = await publish(selection, preparation.derivatives);
      setPublication(result.failed === 0
        ? { status: "succeeded", count: result.succeeded, shareTokens: result.shareTokens ?? [] }
        : { status: "failed", count: result.failed, retryable: true });
    } catch (cause) {
      void cause;
      setPublication({ status: "failed", count: selection.assetIds.length, retryable: false });
    }
  }

  async function cancel() {
    if (publication.status === "uploading") return;
    cancelledRef.current = true;
    if (preparation.status === "ready") {
      await Promise.allSettled(preparation.derivatives.map((derivative) => removeDerivative(derivative.uri)));
    }
    goBack();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header disabled={publication.status === "uploading"} goBack={() => void cancel()} />
      <View style={styles.content}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.count}>선택한 사진 {selection.assetIds.length}장</Text>

        <View style={styles.destinationCard}>
          <Text style={styles.cardEyebrow}>선택한 게시 방식</Text>
          <Text style={styles.cardTitle}>{copy.destination}</Text>
          <Text style={styles.cardCopy}>{copy.description}</Text>
        </View>

        <View style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>아직 업로드하거나 공개하지 않았습니다.</Text>
          <Text style={styles.safetyCopy}>사진 파생본과 공개 정보는 다음 게시 단계에서 다시 검토합니다.</Text>
        </View>

        {preparation.status === "ready" ? (
          <>
            <Text accessibilityLiveRegion="polite" style={styles.confirmed}>게시용 사진 {preparation.derivatives.length}장 준비 완료 · 업로드는 시작되지 않았어요</Text>
            <Text style={styles.metadataCopy}>사진 파일의 EXIF·GPS 등 메타데이터를 제거했습니다.</Text>
            {publication.status === "succeeded" ? (
              <>
                <Text accessibilityLiveRegion="polite" style={styles.successCopy}>사진 {publication.count}장을 안전하게 저장했습니다.</Text>
                {selection.intent === "link" && publication.shareTokens.length > 0 ? (
                  <>
                    <Text accessibilityLiveRegion="polite" style={styles.linkReadyCopy}>공유 링크가 준비됐습니다.</Text>
                    {publication.shareTokens.map((token, index) => (
                      <Pressable
                        accessibilityRole="button"
                        key={token}
                        onPress={() => void shareLink(token)}
                        style={styles.confirmButton}
                      >
                        <Text style={styles.confirmButtonText}>{publication.shareTokens.length === 1
                          ? "공유 링크 보내기"
                          : `공유 링크 ${index + 1} 보내기`}</Text>
                      </Pressable>
                    ))}
                  </>
                ) : null}
              </>
            ) : (
              <>
                {publication.status === "failed" ? (
                  <Text accessibilityLiveRegion="polite" style={styles.errorCopy}>{publication.retryable
                    ? `사진 ${publication.count}장을 저장하지 못했습니다. 재시도 가능한 작업으로 기기에 기록했습니다.`
                    : "업로드를 시작하지 못했습니다. 로그인 상태와 공유 정책을 확인해 주세요."}</Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={publication.status !== "idle" || publish === undefined}
                  onPress={() => void upload()}
                  style={[styles.confirmButton, (publication.status !== "idle" || publish === undefined) && styles.disabledButton]}
                >
                  <Text style={styles.confirmButtonText}>{publish === undefined
                    ? "로그인 후 업로드"
                    : publication.status === "uploading" ? "업로드 중" : "지금 업로드"}</Text>
                </Pressable>
                {publication.status === "idle" ? (
                  <Pressable accessibilityRole="button" onPress={() => void cancel()} style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>게시 취소</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </>
        ) : (
          <>
            {preparation.status === "failed" ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorCopy}>게시용 사진을 준비하지 못했어요. 원본 접근 상태를 확인하고 다시 시도해 주세요.</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={preparation.status === "preparing"}
              onPress={() => void prepare()}
              style={[styles.confirmButton, preparation.status === "preparing" && styles.disabledButton]}
            >
              <Text style={styles.confirmButtonText}>{preparation.status === "preparing"
                ? "게시용 사진 준비 중"
                : preparation.status === "failed" ? "다시 준비" : "사진 선택 확정"}</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Header({ disabled = false, goBack }: { readonly disabled?: boolean; readonly goBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="내 사진으로 돌아가기" accessibilityRole="button" disabled={disabled} onPress={goBack} style={[styles.backButton, disabled && styles.disabledButton]}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View>
        <Text style={styles.eyebrow}>게시 전 확인</Text>
        <Text style={styles.heading}>사진 선택 검토</Text>
      </View>
    </View>
  );
}

export default function PublicationReviewRoute() {
  const auth = useAuthSession();
  const params = useLocalSearchParams<{
    readonly intent?: string | string[];
    readonly assetIds?: string | string[];
  }>();
  const selection = parsePublicationReviewParams(params);
  if (auth.user === null) return <PublicationReviewScreen selection={selection} />;
  const ownerId = auth.user.id;
  return <PublicationReviewScreen
    publish={(nextSelection, derivatives) => publicationRuntime.publish(ownerId, nextSelection, derivatives)}
    selection={selection}
  />;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  header: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 72, paddingHorizontal: 16 },
  backButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  backText: { color: mobileColors.ink, fontSize: 31, lineHeight: 34, marginTop: -3 },
  eyebrow: { color: mobileColors.pine, fontSize: 12, fontWeight: "800" },
  heading: { color: mobileColors.ink, fontSize: 21, fontWeight: "800", marginTop: 2 },
  content: { flex: 1, padding: 16 },
  title: { color: mobileColors.ink, fontSize: 24, fontWeight: "800" },
  count: { color: mobileColors.muted, fontSize: 14, marginTop: 6 },
  destinationCard: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, marginTop: 20, padding: 18 },
  cardEyebrow: { color: mobileColors.pine, fontSize: 12, fontWeight: "800" },
  cardTitle: { color: mobileColors.ink, fontSize: 18, fontWeight: "800", marginTop: 6 },
  cardCopy: { color: mobileColors.muted, fontSize: 14, lineHeight: 21, marginTop: 7 },
  cancelButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, justifyContent: "center", marginTop: 10, minHeight: 44 },
  cancelButtonText: { color: mobileColors.ink, fontSize: 14, fontWeight: "800" },
  safetyCard: { backgroundColor: "#e1eadb", borderRadius: 8, marginTop: 12, padding: 16 },
  safetyTitle: { color: mobileColors.ink, fontSize: 15, fontWeight: "800" },
  safetyCopy: { color: mobileColors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  confirmButton: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 8, justifyContent: "center", marginTop: 20, minHeight: 48 },
  confirmButtonText: { color: mobileColors.surface, fontSize: 15, fontWeight: "800" },
  confirmed: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800", marginTop: 20, padding: 16, textAlign: "center" },
  disabledButton: { opacity: 0.55 },
  errorCopy: { color: "#9b2c2c", fontSize: 13, lineHeight: 19, marginTop: 18 },
  metadataCopy: { color: mobileColors.muted, fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: "center" },
  successCopy: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800", marginTop: 18, textAlign: "center" },
  linkReadyCopy: { color: mobileColors.pineDeep, fontSize: 13, fontWeight: "700", marginTop: 10, textAlign: "center" },
  empty: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  emptyTitle: { color: mobileColors.ink, fontSize: 20, fontWeight: "800", textAlign: "center" },
  emptyCopy: { color: mobileColors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" }
});
