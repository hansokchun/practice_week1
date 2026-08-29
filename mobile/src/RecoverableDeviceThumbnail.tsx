import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { regenerateDevicePhotoThumbnail } from "./device-photo-thumbnail-recovery";
import { mobileColors } from "./mobile-theme";

type RecoverableDeviceThumbnailProps = {
  readonly accessibilityLabel: string;
  readonly assetId: string;
  readonly initialUri: string;
  readonly recoverThumbnail?: (assetId: string) => Promise<string>;
  readonly style?: StyleProp<ViewStyle>;
};

export function RecoverableDeviceThumbnail({
  accessibilityLabel,
  assetId,
  initialUri,
  recoverThumbnail = regenerateDevicePhotoThumbnail,
  style
}: RecoverableDeviceThumbnailProps) {
  const [displayUri, setDisplayUri] = useState(initialUri);
  const [failed, setFailed] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);

  async function recover() {
    if (recovering) return;
    setRecovering(true);
    setRecoveryFailed(false);
    try {
      const uri = await recoverThumbnail(assetId);
      setDisplayUri(uri);
      setFailed(false);
    } catch {
      setRecoveryFailed(true);
    } finally {
      setRecovering(false);
    }
  }

  return (
    <View style={[styles.container, style]}>
      {failed ? (
        <View accessibilityLiveRegion="polite" style={styles.fallback}>
          <Text numberOfLines={2} style={styles.copy}>미리보기를 표시할 수 없어요</Text>
          {recoveryFailed ? <Text numberOfLines={2} style={styles.errorCopy}>원본 접근을 확인하고 다시 시도해 주세요</Text> : null}
          <Pressable
            accessibilityLabel={`${accessibilityLabel} 썸네일 다시 만들기`}
            accessibilityRole="button"
            disabled={recovering}
            onPress={() => void recover()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>{recovering ? "다시 만드는 중" : "다시 시도"}</Text>
          </Pressable>
        </View>
      ) : (
        <Image
          accessibilityLabel={accessibilityLabel}
          onError={() => setFailed(true)}
          source={{ uri: displayUri }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: mobileColors.surface, overflow: "hidden" },
  fallback: { alignItems: "center", flex: 1, justifyContent: "center", padding: 8 },
  copy: { color: mobileColors.ink, fontSize: 12, fontWeight: "800", textAlign: "center" },
  errorCopy: { color: "#9b2c2c", fontSize: 10, marginTop: 4, textAlign: "center" },
  retryButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 8 },
  retryText: { color: mobileColors.pineDeep, fontSize: 12, fontWeight: "800" }
});
