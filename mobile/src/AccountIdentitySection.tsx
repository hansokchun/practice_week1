import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  createAccountIdentityActions,
  type AccountIdentityActions,
  type AccountIdentityState,
  type LinkableAccountProvider
} from "./account-identity-linking";
import { mobileColors } from "./mobile-theme";
import { getSupabaseClient } from "./supabase-client";

type AccountIdentitySectionProps = {
  readonly actions?: AccountIdentityActions;
  readonly userId?: string;
};

const providerLabels: Record<LinkableAccountProvider, string> = { google: "Google", kakao: "Kakao" };

export function AccountIdentitySection({ actions: providedActions, userId }: AccountIdentitySectionProps) {
  const actions = useMemo(() => providedActions ?? createAccountIdentityActions(
    getSupabaseClient().auth,
    userId ?? "",
    Linking.createURL("/auth/callback"),
    WebBrowser.openAuthSessionAsync
  ), [providedActions, userId]);
  const [identities, setIdentities] = useState<AccountIdentityState | null>(null);
  const [busy, setBusy] = useState<LinkableAccountProvider | null>(null);
  const [message, setMessage] = useState("로그인 방법을 확인하는 중…");

  useEffect(() => {
    let active = true;
    actions.load().then((next) => {
      if (!active) return;
      setIdentities(next);
      setMessage("");
    }).catch(() => {
      if (active) setMessage("로그인 방법을 확인하지 못했어요. 다시 시도해 주세요.");
    });
    return () => { active = false; };
  }, [actions]);

  async function link(provider: LinkableAccountProvider) {
    setBusy(provider);
    setMessage(`${providerLabels[provider]} 계정 연결을 시작합니다…`);
    try {
      const result = await actions.link(provider);
      if (result.status === "cancelled") setMessage("계정 연결이 취소되었습니다.");
      else {
        setIdentities(result.identities);
        setMessage(`${providerLabels[provider]} 계정을 연결했습니다.`);
      }
    } catch {
      setMessage("계정을 연결하지 못했어요. 로그인 상태를 확인하고 다시 시도해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>로그인 방법</Text>
      <Text style={styles.copy}>현재 Ikkyee 프로필에 로그인 방법을 추가합니다. 연결 해제는 계정 잠김 방지를 위해 제공하지 않습니다.</Text>
      {identities?.email ? <Text style={styles.status}>이메일 연결됨</Text> : null}
      {(["google", "kakao"] as const).map((provider) => identities?.[provider] ? (
        <Text key={provider} style={styles.status}>{providerLabels[provider]} 연결됨</Text>
      ) : (
        <Pressable
          accessibilityLabel={`${providerLabels[provider]} 계정 연결`}
          accessibilityRole="button"
          disabled={busy !== null || identities === null}
          key={provider}
          onPress={() => link(provider)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{providerLabels[provider]} 연결</Text>
        </Pressable>
      ))}
      {message === "" ? null : <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { alignSelf: "stretch", borderTopColor: mobileColors.line, borderTopWidth: 1, gap: 10, marginTop: 28, paddingTop: 24 },
  title: { color: mobileColors.ink, fontSize: 17, fontWeight: "800" },
  copy: { color: mobileColors.muted, fontSize: 13, lineHeight: 19 },
  status: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "700", minHeight: 24 },
  button: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, justifyContent: "center", minHeight: 48 },
  buttonText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  message: { color: mobileColors.muted, fontSize: 13, lineHeight: 19 }
});
