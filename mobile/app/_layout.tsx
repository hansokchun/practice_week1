import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppErrorBoundary } from "../src/AppErrorBoundary";
import { AuthSessionProvider } from "../src/auth-session";
import { publicationDerivativeRuntime } from "../src/publication-derivative-runtime";

export default function RootLayout() {
  useEffect(() => {
    void publicationDerivativeRuntime.clearExpired();
  }, []);

  return (
    <AppErrorBoundary>
      <AuthSessionProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthSessionProvider>
    </AppErrorBoundary>
  );
}
