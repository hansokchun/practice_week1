import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createEmailAuthActions } from "../../src/email-auth";
import { KeyboardSafeScrollView } from "../../src/KeyboardSafeScrollView";
import { createOAuthActions, type MobileOAuthProvider } from "../../src/oauth-auth";
import { useMobileScreenGutter } from "../../src/mobile-layout";
import { mobileColors } from "../../src/mobile-theme";
import { resolvePostAuthRoute } from "../../src/post-auth-route";
import { getSupabaseClient } from "../../src/supabase-client";

const providers = ["이메일", "Google", "Kakao"] as const;
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const params = useLocalSearchParams<{ readonly returnTo?: string | string[] }>();
  const gutter = useMobileScreenGutter();
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const postAuthRoute = resolvePostAuthRoute(params.returnTo);

  async function run(action: "login" | "reset" | "signup") {
    setBusy(true);
    setMessage(null);
    try {
      const actions = createEmailAuthActions(getSupabaseClient().auth, Linking.createURL("/auth/callback"));
      if (action === "login") {
        await actions.signIn(email, password);
        router.replace(postAuthRoute as never);
      } else if (action === "signup") {
        const result = await actions.signUp(email, password);
        setMessage(result.needsEmailVerification ? "확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요." : "회원가입이 완료되었습니다.");
      } else {
        await actions.requestPasswordReset(email);
        setMessage("비밀번호 재설정 메일을 보냈습니다.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "인증 요청을 완료하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function runOAuth(provider: MobileOAuthProvider) {
    setBusy(true);
    setMessage(`${provider === "google" ? "Google" : "Kakao"} 로그인으로 이동합니다...`);
    try {
      const callbackUrl = Linking.createURL("/auth/callback");
      const actions = createOAuthActions(getSupabaseClient().auth, callbackUrl, WebBrowser.openAuthSessionAsync);
      const result = await actions.signIn(provider);
      if (result.status === "signed_in") router.replace(postAuthRoute as never);
      else setMessage("로그인이 취소되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "소셜 로그인을 완료하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="로그인 닫기" accessibilityRole="button" onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>닫기</Text>
        </Pressable>
      </View>
      <KeyboardSafeScrollView contentContainerStyle={[styles.body, { paddingHorizontal: gutter }]}>
        <Text style={styles.brand}>Ikkyee</Text>
        <Text style={styles.title}>로그인</Text>
        {emailMode ? (
          <View style={styles.emailForm}>
            <TextInput
              accessibilityLabel="이메일"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="name@example.com"
              style={styles.input}
              value={email}
            />
            <TextInput
              accessibilityLabel="비밀번호"
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={setPassword}
              placeholder="8자 이상"
              secureTextEntry
              style={styles.input}
              value={password}
            />
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => run("login")} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>로그인</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => run("signup")} style={styles.providerButton}>
              <Text style={styles.providerText}>회원가입</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => run("reset")} style={styles.textButton}>
              <Text style={styles.textButtonText}>비밀번호 재설정 메일 보내기</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setEmailMode(false)} style={styles.textButton}>
              <Text style={styles.textButtonText}>다른 방법 보기</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.providerList}>
            {providers.map((provider) => (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                key={provider}
                onPress={provider === "이메일"
                  ? () => setEmailMode(true)
                  : () => runOAuth(provider === "Google" ? "google" : "kakao")}
                style={styles.providerButton}
              >
                <Text style={styles.providerText}>{provider}로 계속하기</Text>
              </Pressable>
            ))}
          </View>
        )}
        {message !== null ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
      </KeyboardSafeScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  header: { alignItems: "flex-start", height: 64, justifyContent: "center", paddingHorizontal: 16 },
  closeButton: { justifyContent: "center", minHeight: 44, minWidth: 44 },
  closeText: { color: mobileColors.pineDeep, fontSize: 15, fontWeight: "700" },
  body: { flexGrow: 1, justifyContent: "center", paddingVertical: 24 },
  brand: { color: mobileColors.pine, fontFamily: "Georgia", fontSize: 18, fontWeight: "700", textAlign: "center" },
  title: { color: mobileColors.ink, fontSize: 28, fontWeight: "800", marginTop: 12, textAlign: "center" },
  providerList: { gap: 12, marginTop: 32 },
  emailForm: { gap: 12, marginTop: 32 },
  input: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, color: mobileColors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 16 },
  providerButton: { alignItems: "center", backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, justifyContent: "center", minHeight: 52, paddingHorizontal: 16 },
  providerText: { color: mobileColors.ink, fontSize: 16, fontWeight: "800" },
  primaryButton: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 8, justifyContent: "center", minHeight: 52, paddingHorizontal: 16 },
  primaryButtonText: { color: mobileColors.surface, fontSize: 16, fontWeight: "800" },
  textButton: { alignItems: "center", justifyContent: "center", minHeight: 44 },
  textButtonText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "700" },
  message: { color: mobileColors.pineDeep, fontSize: 14, lineHeight: 20, marginTop: 16, textAlign: "center" }
});
