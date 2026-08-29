import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { blockUser, reportPublicPhoto, type ContentReportReason } from "./content-safety-repository";
import { mobileColors } from "./mobile-theme";

const REPORT_REASON_OPTIONS: readonly { readonly label: string; readonly value: ContentReportReason }[] = [
  { label: "스팸 또는 광고", value: "spam" },
  { label: "괴롭힘 또는 혐오", value: "harassment" },
  { label: "민감하거나 위험한 콘텐츠", value: "sensitive" },
  { label: "저작권 침해", value: "copyright" },
  { label: "기타", value: "other" }
];

type PhotoSafetyControlsProps = {
  readonly blockAuthor?: (blockerId: string, blockedId: string) => Promise<void>;
  readonly currentUserId: string | null;
  readonly onBlocked: () => void;
  readonly ownerId: string;
  readonly photoId: string;
  readonly reportPhoto?: (photoId: string, reporterId: string, reportedUserId: string, reason: ContentReportReason, details: string) => Promise<void>;
};

export function PhotoSafetyControls({
  blockAuthor = blockUser,
  currentUserId,
  onBlocked,
  ownerId,
  photoId,
  reportPhoto = reportPublicPhoto
}: PhotoSafetyControlsProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ContentReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<"reported" | "report_failed" | "block_failed" | null>(null);

  if (currentUserId === null || currentUserId === ownerId) return null;

  async function submitReport() {
    if (currentUserId === null || reportReason === null || pending) return;
    setPending(true);
    setMessage(null);
    try {
      await reportPhoto(photoId, currentUserId, ownerId, reportReason, reportDetails.trim());
      setReportOpen(false);
      setReportReason(null);
      setReportDetails("");
      setMessage("reported");
    } catch {
      setMessage("report_failed");
    } finally {
      setPending(false);
    }
  }

  async function confirmBlock() {
    if (currentUserId === null || pending) return;
    setPending(true);
    setMessage(null);
    try {
      await blockAuthor(currentUserId, ownerId);
      onBlocked();
    } catch {
      setMessage("block_failed");
      setPending(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>안전 도구</Text>
      <View style={styles.actions}>
        <Pressable accessibilityLabel="사진 신고" accessibilityRole="button" disabled={pending} onPress={() => {
          setBlockConfirmOpen(false);
          setReportOpen((value) => !value);
          setMessage(null);
        }} style={styles.button}><Text style={styles.buttonText}>사진 신고</Text></Pressable>
        <Pressable accessibilityLabel="사용자 차단" accessibilityRole="button" disabled={pending} onPress={() => {
          setReportOpen(false);
          setBlockConfirmOpen(true);
          setMessage(null);
        }} style={styles.button}><Text style={styles.buttonText}>사용자 차단</Text></Pressable>
      </View>
      {reportOpen ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>신고 이유를 선택해 주세요</Text>
          <View style={styles.reasonList}>
            {REPORT_REASON_OPTIONS.map((option) => (
              <Pressable accessibilityLabel={option.label} accessibilityRole="button" key={option.value} onPress={() => setReportReason(option.value)} style={[styles.reasonButton, reportReason === option.value && styles.reasonButtonSelected]}>
                <Text style={[styles.reasonText, reportReason === option.value && styles.reasonTextSelected]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput accessibilityLabel="신고 추가 설명" maxLength={500} multiline onChangeText={setReportDetails} placeholder="선택 사항" placeholderTextColor={mobileColors.muted} style={styles.reportInput} value={reportDetails} />
          <Pressable accessibilityLabel="신고 접수" accessibilityRole="button" disabled={reportReason === null || pending} onPress={() => void submitReport()} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{pending ? "접수 중" : "신고 접수"}</Text>
          </Pressable>
        </View>
      ) : null}
      {blockConfirmOpen ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>이 사용자의 사진과 댓글이 더 이상 표시되지 않습니다.</Text>
          <Text style={styles.copy}>프로필의 차단 목록에서 언제든 해제할 수 있습니다.</Text>
          <View style={styles.actions}>
            <Pressable accessibilityLabel="차단 취소" accessibilityRole="button" onPress={() => setBlockConfirmOpen(false)} style={styles.button}><Text style={styles.buttonText}>취소</Text></Pressable>
            <Pressable accessibilityLabel="사용자 차단 확인" accessibilityRole="button" disabled={pending} onPress={() => void confirmBlock()} style={styles.dangerButton}><Text style={styles.dangerButtonText}>{pending ? "차단 중" : "차단"}</Text></Pressable>
          </View>
        </View>
      ) : null}
      {message === "reported" ? <Text accessibilityLiveRegion="polite" style={styles.success}>신고를 접수했습니다.</Text> : null}
      {message === "report_failed" ? <Text accessibilityLiveRegion="polite" style={styles.error}>신고를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.</Text> : null}
      {message === "block_failed" ? <Text accessibilityLiveRegion="polite" style={styles.error}>사용자를 차단하지 못했어요. 잠시 후 다시 시도해 주세요.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderTopColor: mobileColors.line, borderTopWidth: 1, marginTop: 24, paddingTop: 20 },
  title: { color: mobileColors.ink, fontSize: 16, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  button: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 12 },
  buttonText: { color: mobileColors.pineDeep, fontSize: 13, fontWeight: "800" },
  panel: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, marginTop: 12, padding: 14 },
  panelTitle: { color: mobileColors.ink, fontSize: 14, fontWeight: "800", lineHeight: 21 },
  copy: { color: mobileColors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  reasonList: { gap: 6, marginTop: 12 },
  reasonButton: { borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  reasonButtonSelected: { backgroundColor: mobileColors.pineDeep },
  reasonText: { color: mobileColors.ink, fontSize: 13, fontWeight: "700" },
  reasonTextSelected: { color: mobileColors.surface },
  reportInput: { borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, color: mobileColors.ink, fontSize: 13, marginTop: 12, minHeight: 72, padding: 10, textAlignVertical: "top" },
  primaryButton: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 8, justifyContent: "center", marginTop: 12, minHeight: 44 },
  primaryText: { color: mobileColors.surface, fontSize: 14, fontWeight: "800" },
  dangerButton: { alignItems: "center", backgroundColor: "#9b2c2c", borderRadius: 8, flex: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 12 },
  dangerButtonText: { color: mobileColors.surface, fontSize: 13, fontWeight: "800" },
  success: { color: mobileColors.pineDeep, fontSize: 13, fontWeight: "700", marginTop: 10 },
  error: { color: "#9b2c2c", fontSize: 13, lineHeight: 19, marginTop: 10 }
});
