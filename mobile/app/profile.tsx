import { router, type Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { emptyStateStyles as styles, mobileColors } from "../src/mobile-theme";
import { albumsRoute, guestLoginRoute, myPhotosRoute, settingsRoute } from "../src/mobile-routes";
import { DefaultProfileAvatar } from "../src/DefaultProfileAvatar";
import { useAuthSession } from "../src/auth-session";
import { KeyboardSafeScrollView } from "../src/KeyboardSafeScrollView";
import { useMobileScreenGutter } from "../src/mobile-layout";
import { ProfileEditor } from "../src/ProfileEditor";
import { ProfilePublicSummary } from "../src/ProfilePublicSummary";
import { useContentVisibilityRefreshKey } from "../src/content-visibility-refresh";
import { AccountIdentitySection } from "../src/AccountIdentitySection";
import { LegalLinks } from "../src/LegalLinks";

type ProfileScreenProps = { readonly refreshKey?: number };

export function ProfileScreen({ refreshKey = 0 }: ProfileScreenProps) {
  const auth = useAuthSession();
  const gutter = useMobileScreenGutter();

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea} testID="profile-screen">
      <View style={[profileStyles.header, { paddingHorizontal: gutter }]}>
        <Pressable accessibilityLabel="프로필 닫기" accessibilityRole="button" onPress={() => router.back()} style={profileStyles.closeButton}>
          <Ionicons accessible={false} name="arrow-back" size={23} color={mobileColors.ink} />
        </Pressable>
        <Text style={profileStyles.headerTitle}>프로필</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="설정" onPress={() => router.push(settingsRoute as Href)} style={profileStyles.closeButton}>
          <Ionicons accessible={false} name="settings-outline" size={22} color={mobileColors.ink} />
        </Pressable>
      </View>
      {auth.status === "signed_in" ? (
        <KeyboardSafeScrollView contentContainerStyle={[profileStyles.signedInBody, { paddingHorizontal: gutter }]}>
          <>
            {auth.user?.id === undefined ? null : <ProfileEditor userId={auth.user.id} />}
            <View style={profileStyles.libraryLinks}>
              {[{ label: "내 사진", icon: "images-outline" as const, route: myPhotosRoute }, { label: "앨범", icon: "albums-outline" as const, route: albumsRoute }].map((item) => (
                <Pressable key={item.route} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => router.push(item.route)} style={profileStyles.libraryLink}>
                  <Ionicons accessible={false} name={item.icon} size={22} color={mobileColors.pine} />
                  <Text style={profileStyles.libraryLabel}>{item.label}</Text>
                  <Ionicons accessible={false} name="chevron-forward" size={16} color={mobileColors.muted} />
                </Pressable>
              ))}
            </View>
            {auth.user?.id === undefined ? null : <ProfilePublicSummary refreshKey={refreshKey} userId={auth.user.id} />}
            <Text style={profileStyles.accountLabel}>계정</Text>
            <Text style={styles.emptyCopy}>{auth.user?.email ?? "Ikkyee 사용자"}</Text>
            {auth.user?.id === undefined ? null : <AccountIdentitySection userId={auth.user.id} />}
            <Pressable accessibilityRole="button" onPress={() => auth.signOut()} style={profileStyles.signOut}>
              <Text style={profileStyles.signOutText}>이 기기에서 로그아웃</Text>
            </Pressable>
            <LegalLinks />
          </>
        </KeyboardSafeScrollView>
      ) : (
        <View style={styles.body}>
          {auth.status === "loading" ? (
          <Text style={styles.emptyTitle}>세션 확인 중…</Text>
          ) : (
          <>
            <View style={profileStyles.guestAvatar}><DefaultProfileAvatar size={88} /></View>
            <Text style={styles.emptyTitle}>여행 기록을 이어가세요</Text>
            <Text accessibilityLiveRegion={auth.status === "error" ? "polite" : undefined} style={styles.emptyCopy}>{auth.status === "error"
              ? "로그인 상태를 확인하지 못했어요. 다시 로그인해 주세요."
              : "이메일, Google 또는 Kakao로 로그인할 수 있어요."}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push(guestLoginRoute)} style={styles.button}>
              <Text style={styles.buttonText}>로그인하기</Text>
            </Pressable>
            <LegalLinks />
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
  libraryLinks: { flexDirection: "row", alignSelf: "stretch", gap: 12, marginTop: 24 },
  libraryLink: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 58, borderBottomWidth: 1, borderColor: mobileColors.line },
  libraryLabel: { color: mobileColors.ink, fontSize: 15, fontWeight: "600", flex: 1 },
  guestAvatar: { marginBottom: 24 },
  signOut: { alignSelf: "stretch", alignItems: "center", minHeight: 48, justifyContent: "center", marginTop: 24 },
  signOutText: { color: mobileColors.muted, fontSize: 14 },
  signedInBody: { alignItems: "center", flexGrow: 1, paddingBottom: 48, paddingTop: 24 },
  accountLabel: { alignSelf: "stretch", color: "#252c25", fontSize: 17, fontWeight: "800", marginTop: 28 },
  header: { alignItems: "center", flexDirection: "row", minHeight: 64 },
  closeButton: { alignItems: "flex-start", justifyContent: "center", minHeight: 44, minWidth: 44, width: 52 },
  closeText: { color: "#003637", fontSize: 14, fontWeight: "800" },
  headerTitle: { color: mobileColors.ink, flex: 1, fontSize: 19, fontWeight: "700", textAlign: "center" },
  headerSpacer: { width: 52 }
});
