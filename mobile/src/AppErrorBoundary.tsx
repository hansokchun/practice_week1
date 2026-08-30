import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mobileColors } from "./mobile-theme";
import {
  recordReleaseDiagnostic,
  type ReleaseDiagnosticCode,
  type ReleaseDiagnosticSurface,
} from "./release-diagnostics";

type AppErrorBoundaryProps = {
  readonly children: ReactNode;
  readonly report?: (code: ReleaseDiagnosticCode, surface: ReleaseDiagnosticSurface) => unknown;
};

type AppErrorBoundaryState = { readonly failed: boolean };

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {
    (this.props.report ?? recordReleaseDiagnostic)("ui-render-failure", "app-shell");
  }

  private readonly reset = () => {
    this.setState({ failed: false });
  };

  override render() {
    if (!this.state.failed) return this.props.children;

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>앱 화면을 열지 못했어요.</Text>
          <Text style={styles.body}>개인정보는 전송되지 않았습니다. 화면을 다시 열어 보세요.</Text>
          <Pressable
            accessibilityLabel="앱 화면 다시 열기"
            accessibilityRole="button"
            onPress={this.reset}
            style={styles.button}
          >
            <Text style={styles.buttonText}>다시 열기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  content: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  title: { color: mobileColors.ink, fontSize: 22, fontWeight: "900", textAlign: "center" },
  body: { color: mobileColors.muted, fontSize: 15, lineHeight: 23, marginTop: 12, textAlign: "center" },
  button: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 8, justifyContent: "center", marginTop: 26, minHeight: 48, paddingHorizontal: 24 },
  buttonText: { color: mobileColors.surface, fontSize: 15, fontWeight: "800" },
});
