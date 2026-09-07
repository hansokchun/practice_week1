import { useState } from "react";
import {
  ActivityIndicator,
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
  readonly onPress?: (() => void) | undefined;
  readonly onRetry?: (() => void) | undefined;
  readonly pressAccessibilityLabel?: string | undefined;
  readonly resizeMode?: ImageResizeMode | undefined;
  readonly style?: StyleProp<ViewStyle>;
  readonly uri: string;
};

export function RecoverableRemoteImage({
  accessibilityLabel,
  onPress,
  onRetry,
  pressAccessibilityLabel,
  resizeMode = "cover",
  style,
  uri
}: RecoverableRemoteImageProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const failed = failedUri === uri;
  const loaded = loadedUri === uri;

  function retry() {
    setFailedUri(null);
    setLoadedUri(null);
    onRetry?.();
  }

  const content = (
    <>
      {failed ? (
        <View accessibilityLiveRegion="polite" style={styles.fallback}>
          <Text numberOfLines={2} style={styles.copy}>사진을 표시할 수 없어요</Text>
          {onPress !== undefined && onRetry !== undefined ? <Text style={styles.retryText}>다시 시도</Text> : onRetry === undefined ? null : (
            <Pressable
              accessibilityLabel={`${accessibilityLabel} 다시 불러오기`}
              accessibilityRole="button"
              onPress={retry}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          {!loaded ? (
            <View accessibilityLabel={`${accessibilityLabel} 불러오는 중`} style={styles.loading}>
              <ActivityIndicator color={mobileColors.pineDeep} size="small" />
            </View>
          ) : null}
          <Image
            accessibilityLabel={accessibilityLabel}
            fadeDuration={120}
            onError={() => {
              setLoadedUri(null);
              setFailedUri(uri);
            }}
            onLoad={() => setLoadedUri(uri)}
            resizeMode={resizeMode}
            source={{ uri }}
            style={[StyleSheet.absoluteFill, { opacity: loaded ? 1 : 0 }]}
          />
        </>
      )}
    </>
  );

  if (onPress !== undefined) {
    return (
      <Pressable
        accessibilityLabel={failed ? `${accessibilityLabel} 다시 불러오기` : pressAccessibilityLabel ?? accessibilityLabel}
        accessibilityRole="button"
        onPress={failed && onRetry !== undefined ? retry : onPress}
        style={[styles.container, style]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={[styles.container, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: mobileColors.line, overflow: "hidden" },
  loading: { alignItems: "center", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
  fallback: { alignItems: "center", flex: 1, justifyContent: "center", padding: 6 },
  copy: { color: mobileColors.muted, fontSize: 11, fontWeight: "700", textAlign: "center" },
  retryButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 8 },
  retryText: { color: mobileColors.pineDeep, fontSize: 11, fontWeight: "800" }
});
