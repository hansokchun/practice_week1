import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fetchBlockedUsers, unblockUser, type BlockedUser } from "./content-safety-repository";
import { mobileColors } from "./mobile-theme";

type BlockedUsersSectionProps = {
  readonly loadBlockedUsers?: (signal?: AbortSignal) => Promise<BlockedUser[]>;
  readonly unblock?: (blockedUserId: string) => Promise<void>;
};

type BlockedState =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly users: readonly BlockedUser[]; readonly pendingId: string | null; readonly error: boolean };

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { readonly name?: unknown }).name === "AbortError";
}

export function BlockedUsersSection({ loadBlockedUsers = fetchBlockedUsers, unblock = unblockUser }: BlockedUsersSectionProps) {
  const [state, setState] = useState<BlockedState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void loadBlockedUsers(controller.signal)
      .then((users) => { if (!controller.signal.aborted) setState({ status: "ready", users, pendingId: null, error: false }); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbortError(error)) setState({ status: "failed" });
      });
    return () => controller.abort();
  }, [loadBlockedUsers, retryKey]);

  async function removeBlock(user: BlockedUser) {
    if (state.status !== "ready" || state.pendingId !== null) return;
    const previous = state;
    setState({ status: "ready", users: previous.users.filter((entry) => entry.blockedUserId !== user.blockedUserId), pendingId: user.blockedUserId, error: false });
    try {
      await unblock(user.blockedUserId);
      setState((current) => current.status === "ready" ? { ...current, pendingId: null } : current);
    } catch {
      setState({ ...previous, pendingId: null, error: true });
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>차단한 사용자</Text>
      {state.status === "loading" ? <Text accessibilityLiveRegion="polite" style={styles.copy}>차단 목록을 불러오고 있어요.</Text> : null}
      {state.status === "failed" ? (
        <View>
          <Text accessibilityLiveRegion="polite" style={styles.copy}>차단 목록을 불러오지 못했어요.</Text>
          <Pressable accessibilityLabel="차단 목록 다시 시도" accessibilityRole="button" onPress={() => {
            setState({ status: "loading" });
            setRetryKey((value) => value + 1);
          }} style={styles.retryButton}><Text style={styles.retryText}>다시 시도</Text></Pressable>
        </View>
      ) : null}
      {state.status === "ready" ? (
        <View style={styles.list}>
          {state.users.length === 0 ? <Text style={styles.copy}>차단한 사용자가 없습니다.</Text> : state.users.map((user) => (
            <View key={user.blockedUserId} style={styles.row}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{user.displayName.slice(0, 1)}</Text></View>
              <Text numberOfLines={1} style={styles.name}>{user.displayName}</Text>
              <Pressable accessibilityLabel={`${user.displayName} 차단 해제`} accessibilityRole="button" disabled={state.pendingId !== null} onPress={() => void removeBlock(user)} style={styles.unblockButton}>
                <Text style={styles.unblockText}>차단 해제</Text>
              </Pressable>
            </View>
          ))}
          {state.error ? <Text accessibilityLiveRegion="polite" style={styles.error}>차단을 해제하지 못했어요. 잠시 후 다시 시도해 주세요.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { alignSelf: "stretch", borderTopColor: mobileColors.line, borderTopWidth: 1, marginTop: 28, paddingTop: 20 },
  title: { color: mobileColors.ink, fontSize: 17, fontWeight: "800" },
  copy: { color: mobileColors.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
  retryButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, justifyContent: "center", marginTop: 12, minHeight: 44 },
  retryText: { color: mobileColors.pineDeep, fontSize: 13, fontWeight: "800" },
  list: { gap: 8, marginTop: 10 },
  row: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 60, padding: 10 },
  avatar: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  avatarText: { color: mobileColors.surface, fontSize: 13, fontWeight: "800" },
  name: { color: mobileColors.ink, flex: 1, fontSize: 14, fontWeight: "700" },
  unblockButton: { alignItems: "center", borderColor: mobileColors.line, borderRadius: 8, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 12 },
  unblockText: { color: mobileColors.pineDeep, fontSize: 12, fontWeight: "800" },
  error: { color: "#9b2c2c", fontSize: 13, lineHeight: 19 }
});
