import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { emptyStateStyles as styles } from "../src/mobile-theme";
import { guestLoginRoute } from "../src/mobile-routes";
import { useAuthSession } from "../src/auth-session";
import { BlockedUsersSection } from "../src/BlockedUsersSection";
import { AccountDeletionSection } from "../src/AccountDeletionSection";
import { KeyboardSafeScrollView } from "../src/KeyboardSafeScrollView";
import { useMobileScreenGutter } from "../src/mobile-layout";
import { ProfileEditor } from "../src/ProfileEditor";
import { ProfilePublicSummary } from "../src/ProfilePublicSummary";
import { useContentVisibilityRefreshKey } from "../src/content-visibility-refresh";
import { AccountIdentitySection } from "../src/AccountIdentitySection";

type ProfileScreenProps = { readonly refreshKey?: number };

export function ProfileScreen({ refreshKey = 0 }: ProfileScreenProps) {
  const auth = useAuthSession();
  const gutter = useMobileScreenGutter();

  return (
    <SafeAreaView style={styles.safeArea} testID="profile-screen">
      <View style={styles.header}>
        <Pressable accessibilityLabel="프로필 닫기" accessibilityRole="button" onPress={() => router.back()} style={profileStyles.closeButton}>
          <Text>닫기</Text>
        </Pressable>
        <Text style={styles.title}>프로필</Text>
      </View>
      {auth.status === "signed_in" ? (
        <KeyboardSafeScrollView contentContainerStyle={[profileStyles.signedInBody, { paddingHorizontal: gutter }]}>
          <>
            {auth.user?.id === undefined ? null : <ProfileEditor userId={auth.user.id} />}
            {auth.user?.id === undefined ? null : <ProfilePublicSummary refreshKey={refreshKey} userId={auth.user.id} />}
            <Text style={profileStyles.accountLabel}>계정</Text>
            <Text style={styles.emptyCopy}>{auth.user?.email ?? "Ikkyee 사용자"}</Text>
            {auth.user?.id === undefined ? null : <AccountIdentitySection userId={auth.user.id} />}
            <Pressable accessibilityRole="button" onPress={() => auth.signOut()} style={styles.button}>
              <Text style={styles.buttonText}>이 기기에서 로그아웃</Text>
            </Pressable>
            <BlockedUsersSection />
            <AccountDeletionSection />
          </>
        </KeyboardSafeScrollView>
      ) : (
        <View style={styles.body}>
          {auth.status === "loading" ? (
          <Text style={styles.emptyTitle}>세션 확인 중…</Text>
          ) : (
          <>
            <Text style={styles.emptyTitle}>여행 기록을 이어가세요</Text>
            <Text accessibilityLiveRegion={auth.status === "error" ? "polite" : undefined} style={styles.emptyCopy}>{auth.status === "error"
              ? "로그인 상태를 확인하지 못했어요. 다시 로그인해 주세요."
              : "이메일, Google 또는 Kakao로 로그인할 수 있어요."}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push(guestLoginRoute)} style={styles.button}>
              <Text style={styles.buttonText}>로그인하기</Text>
            </Pressable>
          </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

export default function ProfileRoute() {
  const refreshKey = useContentVisibilityRefreshKey();
  return <ProfileScreen refreshKey={refreshKey} />;
}

const profileStyles = StyleSheet.create({
  signedInBody: { alignItems: "center", flexGrow: 1, paddingBottom: 48, paddingTop: 24 },
  accountLabel: { alignSelf: "stretch", color: "#252c25", fontSize: 17, fontWeight: "800", marginTop: 28 },
  closeButton: { alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 44 }
});
