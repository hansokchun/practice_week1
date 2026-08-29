import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { pickPreparedAvatar, type PreparedAvatar } from "./avatar-image-runtime";
import { fetchEditableProfile, saveEditableProfile, type AvatarChange, type EditableProfile, type EditableProfileInput, type SavedEditableProfile } from "./profile-editor-repository";
import { mobileColors } from "./mobile-theme";
import { DefaultProfileAvatar } from "./DefaultProfileAvatar";

type ProfileEditorProps = {
  readonly userId: string;
  readonly loadProfile?: (userId: string, signal?: AbortSignal) => Promise<EditableProfile>;
  readonly pickAvatar?: () => Promise<PreparedAvatar | null>;
  readonly saveProfile?: (input: EditableProfileInput) => Promise<SavedEditableProfile>;
};

type EditorState =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | {
    readonly status: "ready";
    readonly profile: EditableProfile;
    readonly nickname: string;
    readonly bio: string;
    readonly picked: PreparedAvatar | null;
    readonly removeAvatar: boolean;
    readonly saving: boolean;
    readonly message: string | null;
  };

export function ProfileEditor({ userId, loadProfile = fetchEditableProfile, pickAvatar = pickPreparedAvatar, saveProfile = saveEditableProfile }: ProfileEditorProps) {
  const [state, setState] = useState<EditorState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void loadProfile(userId, controller.signal).then((profile) => {
      if (controller.signal.aborted) return;
      setState({ status: "ready", profile, nickname: profile.nickname, bio: profile.bio, picked: null, removeAvatar: false, saving: false, message: null });
    }).catch(() => { if (!controller.signal.aborted) setState({ status: "failed" }); });
    return () => controller.abort();
  }, [loadProfile, retryKey, userId]);

  async function chooseAvatar() {
    if (state.status !== "ready") return;
    setState((current) => current.status === "ready" ? { ...current, message: null } : current);
    try {
      const next = await pickAvatar();
      if (next !== null) setState((current) => current.status === "ready" ? { ...current, picked: next, removeAvatar: false } : current);
    } catch { setState((current) => current.status === "ready" ? { ...current, message: "프로필 사진을 준비하지 못했어요." } : current); }
  }

  async function save() {
    if (state.status !== "ready" || state.saving) return;
    const beforeSave = state;
    setState({ ...state, saving: true, message: null });
    const avatarChange: AvatarChange = state.picked !== null ? { kind: "replace", bytes: state.picked.bytes } : state.removeAvatar ? { kind: "remove" } : { kind: "keep" };
    try {
      const profile = await saveProfile({ userId, nickname: state.nickname, bio: state.bio, currentAvatarPath: state.profile.avatarPath, avatarChange });
      setState({ status: "ready", profile, nickname: profile.nickname, bio: profile.bio, picked: null, removeAvatar: false, saving: false, message: profile.cleanupPending ? "프로필은 저장됐지만 이전 사진 정리가 지연되고 있어요." : "프로필을 저장했습니다." });
    } catch (error) {
      setState({ ...beforeSave, saving: false, message: error instanceof Error && /^(이름|소개|프로필 사진|안전한 JPEG)/u.test(error.message) ? error.message : "프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." });
    }
  }

  if (state.status === "loading") return <Text accessibilityLiveRegion="polite" style={styles.copy}>프로필을 불러오고 있어요.</Text>;
  if (state.status === "failed") return <View style={styles.section}><Text accessibilityLiveRegion="polite" style={styles.copy}>프로필을 불러오지 못했어요.</Text><Pressable accessibilityLabel="프로필 다시 시도" accessibilityRole="button" onPress={() => { setState({ status: "loading" }); setRetryKey((value) => value + 1); }} style={styles.secondaryButton}><Text style={styles.secondaryText}>다시 시도</Text></Pressable></View>;

  const previewUri = state.picked?.previewUri ?? (state.removeAvatar ? null : state.profile.avatarUrl);
  return <View style={styles.section}>
    <Text style={styles.title}>프로필 설정</Text>
    <View style={styles.avatarRow}>
      {previewUri === null ? <DefaultProfileAvatar size={80} /> : <Image accessibilityLabel={state.picked === null ? "현재 프로필 사진" : "선택한 프로필 사진 미리보기"} source={{ uri: previewUri }} style={styles.avatar} />}
      <View style={styles.avatarActions}>
        <Pressable accessibilityLabel="프로필 사진 선택" accessibilityRole="button" disabled={state.saving} onPress={() => void chooseAvatar()} style={styles.secondaryButton}><Text style={styles.secondaryText}>사진 선택</Text></Pressable>
        {(state.profile.avatarUrl !== null || state.picked !== null) ? <Pressable accessibilityLabel="프로필 사진 제거" accessibilityRole="button" disabled={state.saving} onPress={() => setState((current) => current.status === "ready" ? { ...current, picked: null, removeAvatar: true, message: null } : current)} style={styles.linkButton}><Text style={styles.removeText}>기본 이미지 사용</Text></Pressable> : null}
      </View>
    </View>
    <Text style={styles.label}>이름</Text>
    <TextInput accessibilityLabel="프로필 이름" autoCapitalize="none" maxLength={40} onChangeText={(nickname) => setState((current) => current.status === "ready" ? { ...current, nickname, message: null } : current)} style={styles.input} value={state.nickname} />
    <Text style={styles.counter}>{state.nickname.length}/40</Text>
    <Text style={styles.label}>소개</Text>
    <TextInput accessibilityLabel="프로필 소개" maxLength={300} multiline onChangeText={(bio) => setState((current) => current.status === "ready" ? { ...current, bio, message: null } : current)} style={[styles.input, styles.bioInput]} value={state.bio} />
    <Text style={styles.counter}>{state.bio.length}/300</Text>
    <Pressable accessibilityLabel="프로필 저장" accessibilityRole="button" disabled={state.saving} onPress={() => void save()} style={[styles.saveButton, state.saving && styles.disabled]}><Text style={styles.saveText}>{state.saving ? "저장 중…" : "저장하기"}</Text></Pressable>
    {state.message === null ? null : <Text accessibilityLiveRegion="polite" style={styles.message}>{state.message}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  section: { alignSelf: "stretch" },
  title: { color: mobileColors.ink, fontSize: 20, fontWeight: "800" },
  copy: { color: mobileColors.muted, fontSize: 14, lineHeight: 21 },
  avatarRow: { alignItems: "center", flexDirection: "row", gap: 16, marginTop: 18 },
  avatar: { borderRadius: 40, height: 80, width: 80 },
  avatarActions: { alignItems: "flex-start", gap: 4 },
  label: { color: mobileColors.ink, fontSize: 14, fontWeight: "700", marginTop: 18 },
  input: { borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, color: mobileColors.ink, fontSize: 15, marginTop: 8, minHeight: 48, paddingHorizontal: 12 },
  bioInput: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end", color: mobileColors.muted, fontSize: 11, marginTop: 4 },
  secondaryButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 16 },
  secondaryText: { color: mobileColors.pineDeep, fontSize: 13, fontWeight: "800" },
  linkButton: { minHeight: 40, justifyContent: "center" },
  removeText: { color: "#9b2c2c", fontSize: 12, fontWeight: "700" },
  saveButton: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 8, justifyContent: "center", marginTop: 20, minHeight: 50 },
  saveText: { color: mobileColors.surface, fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  message: { color: mobileColors.muted, fontSize: 13, lineHeight: 19, marginTop: 10 }
});
