import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { completeAuthCallback } from "../../src/auth-callback";
import { mobileColors } from "../../src/mobile-theme";
import { guestLoginRoute, passwordUpdateRoute, profileRoute } from "../../src/mobile-routes";
import { getSupabaseClient } from "../../src/supabase-client";

export default function AuthCallbackScreen() {
  const callbackUrl = Linking.useURL();
  const handledUrl = useRef<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (callbackUrl === null || handledUrl.current === callbackUrl) return;
    handledUrl.current = callbackUrl;

    void completeAuthCallback(getSupabaseClient().auth, callbackUrl)
      .then(({ intent }) => {
        router.replace(intent === "password_recovery" ? passwordUpdateRoute : profileRoute);
      })
      .catch(() => {
        setErrorMessage("인증 링크를 처리하지 못했습니다. 로그인 화면에서 다시 시도해 주세요.");
      });
  }, [callbackUrl]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.brand}>Ikkyee</Text>
        <Text style={styles.title}>{errorMessage === null ? "인증 링크를 확인하고 있어요" : "인증 링크를 확인할 수 없어요"}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.description}>
          {errorMessage ?? "잠시만 기다려 주세요."}
        </Text>
        {errorMessage !== null ? (
          <Pressable accessibilityRole="button" onPress={() => router.replace(guestLoginRoute)} style={styles.button}>
            <Text style={styles.buttonText}>로그인으로 돌아가기</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { alignItems: "center", backgroundColor: mobileColors.paper, flex: 1, justifyContent: "center", padding: 24 },
  card: { alignItems: "center", maxWidth: 440, width: "100%" },
  brand: { color: mobileColors.pine, fontFamily: "Georgia", fontSize: 18, fontWeight: "700" },
  title: { color: mobileColors.ink, fontSize: 24, fontWeight: "800", marginTop: 12, textAlign: "center" },
  description: { color: mobileColors.muted, fontSize: 15, lineHeight: 22, marginTop: 12, textAlign: "center" },
  button: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 8, justifyContent: "center", marginTop: 24, minHeight: 52, paddingHorizontal: 20, width: "100%" },
  buttonText: { color: mobileColors.surface, fontSize: 16, fontWeight: "800" }
});
