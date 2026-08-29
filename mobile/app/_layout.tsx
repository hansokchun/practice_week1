import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthSessionProvider } from "../src/auth-session";
import { publicationDerivativeRuntime } from "../src/publication-derivative-runtime";

export default function RootLayout() {
  useEffect(() => {
    void publicationDerivativeRuntime.clearExpired();
  }, []);

  return (
    <AuthSessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthSessionProvider>
  );
}
