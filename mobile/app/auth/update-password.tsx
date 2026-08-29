import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { updateRecoveredPassword, validateRecoveredPasswordInput } from "../../src/auth-callback";
import { KeyboardSafeScrollView } from "../../src/KeyboardSafeScrollView";
import { useMobileScreenGutter } from "../../src/mobile-layout";
import { mobileColors } from "../../src/mobile-theme";
import { profileRoute } from "../../src/mobile-routes";
import { getSupabaseClient } from "../../src/supabase-client";

type UpdatePasswordScreenProps = {
  readonly goToProfile?: () => void;
  readonly updatePassword?: (password: string, confirmation: string) => Promise<void>;
};

export function UpdatePasswordScreen({
  goToProfile = () => router.replace(profileRoute),
  updatePassword = (password, confirmation) => updateRecoveredPassword(
    getSupabaseClient().auth, password, confirmation
  )
}: UpdatePasswordScreenProps = {}) {
  const gutter = useMobileScreenGutter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      validateRecoveredPasswordInput(password, confirmation);
      await updatePassword(password, confirmation);
      setCompleted(true);
      setMessage("새 비밀번호가 저장되었습니다.");
    } catch (error) {
      const validationMessage = error instanceof Error && [
        "비밀번호는 8자 이상이어야 합니다.",
        "비밀번호가 일치하지 않습니다."
      ].includes(error.message) ? error.message : null;
      setMessage(validationMessage ?? "비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardSafeScrollView contentContainerStyle={[styles.body, { paddingHorizontal: gutter }]}>
        <Text style={styles.brand}>Ikkyee</Text>
        <Text style={styles.title}>새 비밀번호 설정</Text>
        <Text style={styles.description}>앞으로 사용할 비밀번호를 8자 이상 입력해 주세요.</Text>
        {!completed ? (
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="새 비밀번호"
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setPassword}
              placeholder="8자 이상"
              secureTextEntry
              style={styles.input}
              value={password}
            />
            <TextInput
              accessibilityLabel="새 비밀번호 확인"
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setConfirmation}
              placeholder="한 번 더 입력"
              secureTextEntry
              style={styles.input}
              value={confirmation}
            />
            <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={styles.button}>
              <Text style={styles.buttonText}>{busy ? "저장 중..." : "비밀번호 저장"}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={goToProfile} style={styles.button}>
            <Text style={styles.buttonText}>프로필로 이동</Text>
          </Pressable>
        )}
        {message !== null ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
      </KeyboardSafeScrollView>
    </SafeAreaView>
  );
}

export default UpdatePasswordScreen;

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  body: { flexGrow: 1, justifyContent: "center", paddingVertical: 24 },
  brand: { color: mobileColors.pine, fontFamily: "Georgia", fontSize: 18, fontWeight: "700", textAlign: "center" },
  title: { color: mobileColors.ink, fontSize: 28, fontWeight: "800", marginTop: 12, textAlign: "center" },
  description: { color: mobileColors.muted, fontSize: 15, lineHeight: 23, marginTop: 12, textAlign: "center" },
  form: { gap: 12, marginTop: 28 },
  input: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, color: mobileColors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 16 },
  button: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 8, justifyContent: "center", marginTop: 20, minHeight: 52, paddingHorizontal: 16 },
  buttonText: { color: mobileColors.surface, fontSize: 16, fontWeight: "800" },
  message: { color: mobileColors.pineDeep, fontSize: 14, lineHeight: 20, marginTop: 16, textAlign: "center" }
});
