import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageResizeMode,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { mobileColors } from "./mobile-theme";

type RecoverableRemoteImageProps = {
  readonly accessibilityLabel: string;
  readonly onRetry?: (() => void) | undefined;
  readonly resizeMode?: ImageResizeMode | undefined;
  readonly style?: StyleProp<ViewStyle>;
  readonly uri: string;
};

export function RecoverableRemoteImage({
  accessibilityLabel,
  onRetry,
  resizeMode = "cover",
  style,
  uri
}: RecoverableRemoteImageProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = failedUri === uri;

  return (
    <View style={[styles.container, style]}>
      {failed ? (
        <View accessibilityLiveRegion="polite" style={styles.fallback}>
          <Text numberOfLines={2} style={styles.copy}>사진을 표시할 수 없어요</Text>
          {onRetry === undefined ? null : (
            <Pressable
              accessibilityLabel={`${accessibilityLabel} 다시 불러오기`}
              accessibilityRole="button"
              onPress={() => {
                setFailedUri(null);
                onRetry();
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Image
          accessibilityLabel={accessibilityLabel}
          onError={() => setFailedUri(uri)}
          resizeMode={resizeMode}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: mobileColors.line, overflow: "hidden" },
  fallback: { alignItems: "center", flex: 1, justifyContent: "center", padding: 6 },
  copy: { color: mobileColors.muted, fontSize: 11, fontWeight: "700", textAlign: "center" },
  retryButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 8 },
  retryText: { color: mobileColors.pineDeep, fontSize: 11, fontWeight: "800" }
});
