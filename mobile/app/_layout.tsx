import { useEffect, useState } from "react";
import { Stack, router, usePathname } from "expo-router";
import { Keyboard, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { AppErrorBoundary } from "../src/AppErrorBoundary";
import { AuthSessionProvider } from "../src/auth-session";
import { publicationDerivativeRuntime } from "../src/publication-derivative-runtime";
import { AppNavigation } from "../src/AppNavigation";

export default function RootLayout() {
  const pathname = usePathname();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => {
    void publicationDerivativeRuntime.clearExpired();
  }, []);

  return (
    <AppErrorBoundary>
      <AuthSessionProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}><Stack screenOptions={{ headerShown: false }} /></View>
        {!keyboardVisible && <AppNavigation pathname={pathname} navigate={(path) => router.navigate(path as never)} />}
      </AuthSessionProvider>
    </AppErrorBoundary>
  );
}
