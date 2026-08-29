import type { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type KeyboardAvoidingViewProps,
  type ScrollViewProps
} from "react-native";

export function getKeyboardAvoidingBehavior(
  platform: string
): KeyboardAvoidingViewProps["behavior"] {
  if (platform === "ios") return "padding";
  if (platform === "android") return "height";
  return undefined;
}

type KeyboardSafeScrollViewProps = PropsWithChildren<ScrollViewProps & {
  readonly keyboardVerticalOffset?: number;
}>;

export function KeyboardSafeScrollView({
  children,
  keyboardVerticalOffset = 0,
  ...scrollViewProps
}: KeyboardSafeScrollViewProps) {
  return (
    <KeyboardAvoidingView
      behavior={getKeyboardAvoidingBehavior(Platform.OS)}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={styles.container}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }
});
