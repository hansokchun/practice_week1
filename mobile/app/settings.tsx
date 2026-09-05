import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccountDeletionSection } from "../src/AccountDeletionSection";
import { AccountIdentitySection } from "../src/AccountIdentitySection";
import { loadAccountSettings, saveAccountSettings, type AccountSettings } from "../src/account-settings";
import { useAuthSession } from "../src/auth-session";
import { BlockedUsersSection } from "../src/BlockedUsersSection";
import { KeyboardSafeScrollView } from "../src/KeyboardSafeScrollView";
import { LegalLinks } from "../src/LegalLinks";
import { mobileColors } from "../src/mobile-theme";
import { guestLoginRoute, profileRoute } from "../src/mobile-routes";
import {
  feedbackCategories,
  submitProductFeedback,
  type FeedbackCategory,
  type FeedbackDraft
} from "../src/product-feedback-repository";

const categoryLabels: Record<FeedbackCategory, string> = {
  bug: "오류",
  usability: "불편함",
  feature_request: "기능 제안",
  other: "기타"
};

type SettingsScreenProps = {
  readonly email: string;
  readonly loadSettings?: (userId: string) => Promise<AccountSettings>;
  readonly onEditProfile: () => void;
  readonly onSignOut: () => Promise<void>;
  readonly saveSettings?: (userId: string, settings: AccountSettings) => Promise<void>;
  readonly showAccountSections?: boolean;
  readonly submitFeedback?: (userId: string, draft: FeedbackDraft) => Promise<void>;
  readonly userId: string;
};

export function SettingsScreen({
  email,
  loadSettings = loadAccountSettings,
  onEditProfile,
  onSignOut,
  saveSettings = saveAccountSettings,
  showAccountSections = true,
  submitFeedback = submitProductFeedback,
  userId
}: SettingsScreenProps) {
  const [settings, setSettings] = useState<AccountSettings>({ defaultVisibility: "private" });
  const [settingsStatus, setSettingsStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [category, setCategory] = useState<FeedbackCategory>("usability");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [contactAllowed, setContactAllowed] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  useEffect(() => {
    let mounted = true;
    void loadSettings(userId).then((value) => {
      if (mounted) {
        setSettings(value);
        setSettingsStatus("ready");
      }
    }).catch(() => {
      if (mounted) setSettingsStatus("failed");
    });
    return () => { mounted = false; };
  }, [loadSettings, userId]);

  async function updateDefaultVisibility(defaultVisibility: AccountSettings["defaultVisibility"]) {
    if (settingsStatus === "loading") return;
    const previous = settings;
    const next = { defaultVisibility };
    setSettings(next);
    setSettingsStatus("ready");
    try {
      await saveSettings(userId, next);
    } catch {
      setSettings(previous);
      setSettingsStatus("failed");
    }
  }

  async function sendFeedback() {
    if (message.trim().length < 3 || feedbackStatus === "sending") {
      setFeedbackStatus("failed");
      return;
    }
    setFeedbackStatus("sending");
    try {
      await submitFeedback(userId, { category, contactAllowed, message, pagePath: "/settings", rating });
      setMessage("");
      setRating(null);
      setContactAllowed(false);
      setFeedbackStatus("sent");
    } catch {
      setFeedbackStatus("failed");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} testID="settings-screen">
      <View style={styles.header}>
        <Pressable accessibilityLabel="설정 닫기" accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>닫기</Text>
        </Pressable>
        <Text style={styles.screenTitle}>설정</Text>
      </View>
      <KeyboardSafeScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>내 계정</Text>
          <Text style={styles.email}>{email || "Ikkyee 사용자"}</Text>
          <Pressable accessibilityRole="button" onPress={onEditProfile} style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>프로필 수정</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>새 사진 기본값</Text>
          <Text style={styles.copy}>업로드 검토 화면에 처음 선택할 공개 범위입니다.</Text>
          <View accessibilityRole="radiogroup" style={styles.segmented}>
            {(["private", "public"] as const).map((value) => {
              const selected = settings.defaultVisibility === value;
              return (
                <Pressable
                  accessibilityLabel={`${value === "private" ? "비공개" : "공개"} 게시로 기본값 설정`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={value}
                  onPress={() => void updateDefaultVisibility(value)}
                  style={[styles.segment, selected && styles.segmentSelected]}
                  testID={`default-${value}`}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{value === "private" ? "비공개" : "공개"}</Text>
                </Pressable>
              );
            })}
          </View>
          {settingsStatus === "failed" ? <Text accessibilityLiveRegion="polite" style={styles.error}>기본값을 저장하지 못했어요.</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>의견 보내기</Text>
          <View accessibilityRole="radiogroup" style={styles.chips}>
            {feedbackCategories.map((value) => (
              <Pressable accessibilityRole="radio" accessibilityState={{ selected: category === value }} key={value} onPress={() => setCategory(value)} style={[styles.chip, category === value && styles.chipSelected]}>
                <Text style={[styles.chipText, category === value && styles.chipTextSelected]}>{categoryLabels[value]}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            accessibilityLabel="의견 내용"
            maxLength={1000}
            multiline
            onChangeText={(value) => { setMessage(value); setFeedbackStatus("idle"); }}
            placeholder="좋았던 점이나 불편했던 점을 적어 주세요."
            style={styles.feedbackInput}
            testID="feedback-message"
            textAlignVertical="top"
            value={message}
          />
          <Text style={styles.count}>{message.length}/1000</Text>
          <Text style={styles.ratingLabel}>만족도</Text>
          <View accessibilityRole="radiogroup" style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable accessibilityLabel={`만족도 ${value}점`} accessibilityRole="radio" accessibilityState={{ selected: rating === value }} key={value} onPress={() => setRating(value)} style={[styles.ratingButton, rating === value && styles.ratingSelected]}>
                <Text style={[styles.ratingText, rating === value && styles.ratingTextSelected]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.contactRow}>
            <View style={styles.contactCopy}>
              <Text style={styles.contactTitle}>답변을 위해 연락 ᄋ허요</Text>
              <Text style={styles.copy}>계정 이메일로만 연락합니다.</Text>
            </View>
            <Switch accessibilityLabel="의견 답변 연락 허요" onValueChange={setContactAllowed} trackColor={{ false: "#d8dcda", true: mobileColors.pine }} value={contactAllowed} />
          </View>
          {feedbackStatus === "failed" ? <Text accessibilityLiveRegion="polite" style={styles.error}>의견을 3자 이상 적거나 잠시 후 다시 시도해 주세요.</Text> : null}
          {feedbackStatus === "sent" ? <Text accessibilityLiveRegion="polite" style={styles.success} testID="feedback-success">의견을 보냈어요.</Text> : null}
          <Pressable accessibilityRole="button" disabled={feedbackStatus === "sending"} onPress={() => void sendFeedback()} style={styles.primaryButton} testID="feedback-submit">
            <Text style={styles.primaryButtonText}>{feedbackStatus === "sending" ? "보내는 중…" : "의견 보내기"}</Text>
          </Pressable>
        </View>

        {showAccountSections ? <AccountIdentitySection userId={userId} /> : null}
        {showAccountSections ? <BlockedUsersSection /> : null}
        <LegalLinks />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정</Text>
          <Pressable accessibilityRole="button" onPress={() => void onSignOut()} style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>이 기기에서 로그아웃</Text>
          </Pressable>
        </View>
        {showAccountSections ? <AccountDeletionSection /> : null}
      </KeyboardSafeScrollView>
    </SafeAreaView>
  );
}

export default function SettingsRoute() {
  const auth = useAuthSession();
  if (auth.status !== "signed_in" || auth.user?.id === undefined) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyBody}>
          <Text style={styles.sectionTitle}>{auth.status === "loading" ? "로그인 화긴 중…" : "로그인하고 설정을 화긴하세요"}</Text>
          {auth.status === "loading" ? null : (
            <Pressable accessibilityRole="button" onPress={() => router.replace(guestLoginRoute)} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>로그인하기</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SettingsScreen
      email={auth.user.email ?? ""}
      onEditProfile={() => router.push(profileRoute)}
      onSignOut={async () => { await auth.signOut(); router.replace("/"); }}
      userId={auth.user.id}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  header: { alignItems: "center", flexDirection: "row", minHeight: 64, paddingHorizontal: 16 },
  headerButton: { alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 44 },
  headerButtonText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  screenTitle: { color: mobileColors.ink, fontSize: 26, fontWeight: "900", marginLeft: 12 },
  content: { paddingBottom: 56, paddingHorizontal: 20 },
  section: { alignSelf: "stretch", borderTopColor: mobileColors.line, borderTopWidth: 1, marginTop: 28, paddingTop: 20 },
  sectionTitle: { color: mobileColors.ink, fontSize: 17, fontWeight: "800" },
  email: { color: mobileColors.muted, fontSize: 14, marginTop: 8 },
  copy: { color: mobileColors.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  outlineButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, justifyContent: "center", marginTop: 14, minHeight: 46 },
  outlineButtonText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  segmented: { backgroundColor: "#e9ece9", borderRadius: 8, flexDirection: "row", marginTop: 14, padding: 3 },
  segment: { alignItems: "center", borderRadius: 6, flex: 1, justifyContent: "center", minHeight: 44 },
  segmentSelected: { backgroundColor: mobileColors.pineDeep },
  segmentText: { color: mobileColors.muted, fontSize: 14, fontWeight: "800" },
  segmentTextSelected: { color: mobileColors.surface },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: { borderColor: mobileColors.line, borderRadius: 18, borderWidth: 1, justifyContent: "center", minHeight: 38, paddingHorizontal: 13 },
  chipSelected: { backgroundColor: mobileColors.pineDeep, borderColor: mobileColors.pineDeep },
  chipText: { color: mobileColors.pineDeep, fontSize: 13, fontWeight: "700" },
  chipTextSelected: { color: mobileColors.surface },
  feedbackInput: { backgroundColor: mobileColors.surface, borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, color: mobileColors.ink, fontSize: 14, lineHeight: 21, marginTop: 14, minHeight: 128, padding: 12 },
  count: { alignSelf: "flex-end", color: mobileColors.muted, fontSize: 12, marginTop: 5 },
  ratingLabel: { color: mobileColors.ink, fontSize: 13, fontWeight: "800", marginTop: 14 },
  ratingRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  ratingButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 44 },
  ratingSelected: { backgroundColor: mobileColors.pineDeep, borderColor: mobileColors.pineDeep },
  ratingText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "800" },
  ratingTextSelected: { color: mobileColors.surface },
  contactRow: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 16 },
  contactCopy: { flex: 1 },
  contactTitle: { color: mobileColors.ink, fontSize: 13, fontWeight: "800" },
  primaryButton: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 8, justifyContent: "center", marginTop: 16, minHeight: 48, paddingHorizontal: 18 },
  primaryButtonText: { color: mobileColors.surface, fontSize: 14, fontWeight: "800" },
  error: { color: "#9b2c2c", fontSize: 13, lineHeight: 19, marginTop: 10 },
  success: { color: mobileColors.pineDeep, fontSize: 13, fontWeight: "700", marginTop: 10 },
  emptyBody: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 }
});
