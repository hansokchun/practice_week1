import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { clearLocalAccountData } from "./account-local-cleanup";
import { deleteRemoteAccount } from "./account-deletion-client";
import { mobileColors } from "./mobile-theme";
import { getSupabaseClient } from "./supabase-client";

type AccountDeletionSectionProps = {
  readonly clearLocalData?: () => Promise<void>;
  readonly deleteAccount?: () => Promise<void>;
  readonly finish?: () => Promise<void>;
};

async function finishDeletion(): Promise<void> {
  await getSupabaseClient().auth.signOut({ scope: "local" });
  router.replace("/");
}

export function AccountDeletionSection({
  clearLocalData = clearLocalAccountData,
  deleteAccount = deleteRemoteAccount,
  finish = finishDeletion
}: AccountDeletionSectionProps) {
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);
  const confirmed = confirmation === "계정 삭제";

  async function removeAccount() {
    if (!confirmed || deleting) return;
    setDeleting(true);
    setFailed(false);
    try {
      await clearLocalData();
      await deleteAccount();
      await finish();
    } catch {
      setFailed(true);
      setDeleting(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>계정 삭제</Text>
      {!confirming ? (
        <>
          <Text style={styles.copy}>클라우드에 공유한 여행 기록과 프로필을 영구적으로 삭제합니다.</Text>
          <Pressable accessibilityLabel="계정 삭제 시작" accessibilityRole="button" onPress={() => setConfirming(true)} style={styles.outlineButton}>
            <Text style={styles.dangerText}>계정 삭제</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.confirmation}>
          <Text style={styles.warning}>프로필, 업로드한 사진, 앨범, 댓글과 저장소 파일이 삭제되며 되돌릴 수 없습니다. 기기의 원본 사진은 유지됩니다.</Text>
          <Text style={styles.label}>계속하려면 ‘계정 삭제’를 입력하세요.</Text>
          <TextInput
            accessibilityLabel="계정 삭제 확인 문구"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!deleting}
            onChangeText={setConfirmation}
            placeholder="계정 삭제"
            style={styles.input}
            value={confirmation}
          />
          {failed ? <Text accessibilityLiveRegion="polite" style={styles.error}>계정을 삭제하지 못했어요. 다시 시도해 주세요.</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={deleting} onPress={() => { setConfirming(false); setConfirmation(""); setFailed(false); }} style={styles.cancelButton}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
            <Pressable accessibilityLabel="계정 영구 삭제" accessibilityRole="button" disabled={!confirmed || deleting} onPress={() => void removeAccount()} style={[styles.deleteButton, (!confirmed || deleting) && styles.disabled]}>
              <Text style={styles.deleteText}>{deleting ? "삭제 중…" : "계정 영구 삭제"}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { alignSelf: "stretch", borderTopColor: mobileColors.line, borderTopWidth: 1, marginTop: 28, paddingTop: 20 },
  title: { color: "#9b2c2c", fontSize: 17, fontWeight: "800" },
  copy: { color: mobileColors.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
  outlineButton: { alignItems: "center", borderColor: "#c53030", borderRadius: 8, borderWidth: 1, justifyContent: "center", marginTop: 12, minHeight: 44 },
  dangerText: { color: "#9b2c2c", fontSize: 13, fontWeight: "800" },
  confirmation: { gap: 10, marginTop: 10 },
  warning: { backgroundColor: "#fff5f5", borderRadius: 8, color: "#822727", fontSize: 13, lineHeight: 20, padding: 12 },
  label: { color: mobileColors.ink, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  input: { borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, color: mobileColors.ink, minHeight: 46, paddingHorizontal: 12 },
  error: { color: "#9b2c2c", fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: "row", gap: 8 },
  cancelButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 44 },
  cancelText: { color: mobileColors.ink, fontSize: 13, fontWeight: "800" },
  deleteButton: { alignItems: "center", backgroundColor: "#9b2c2c", borderRadius: 8, flex: 1.5, justifyContent: "center", minHeight: 44 },
  deleteText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  disabled: { opacity: 0.45 }
});
