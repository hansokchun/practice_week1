import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createContext, type PropsWithChildren, useContext, useEffect, useRef, useState } from "react";

import { bootstrapAuthSession } from "./email-auth";
import { getSupabaseClient, registerAuthAutoRefresh } from "./supabase-client";

type AuthSessionState = {
  error: string | null;
  signOut(): Promise<void>;
  status: "error" | "loading" | "signed_in" | "signed_out";
  user: User | null;
};

const signedOutDefault: AuthSessionState = {
  error: null,
  signOut: async () => {},
  status: "signed_out",
  user: null
};

export const AuthSessionContext = createContext<AuthSessionState>(signedOutDefault);

type AuthSessionProviderProps = PropsWithChildren<{
  clientFactory?: () => SupabaseClient;
}>;

export function AuthSessionProvider({ children, clientFactory = getSupabaseClient }: AuthSessionProviderProps) {
  const [state, setState] = useState<Omit<AuthSessionState, "signOut">>({ error: null, status: "loading", user: null });
  const clientRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    let mounted = true;
    let cleanupRefresh: (() => void) | undefined;
    let unsubscribe: (() => void) | undefined;

    async function verify(client: SupabaseClient) {
      try {
        const result = await bootstrapAuthSession(client.auth);
        if (mounted) setState({ error: null, status: result.status, user: result.user as User | null });
      } catch (error) {
        void error;
        if (mounted) setState({ error: "로그인 상태를 확인하지 못했어요. 다시 로그인해 주세요.", status: "error", user: null });
      }
    }

    try {
      const client = clientFactory();
      clientRef.current = client;
      cleanupRefresh = registerAuthAutoRefresh(client.auth);
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        if (session === null) {
          if (mounted) setState({ error: null, status: "signed_out", user: null });
        } else {
          void verify(client);
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
      void verify(client);
    } catch (error) {
      void error;
      const message = "로그인 설정을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.";
      queueMicrotask(() => {
        if (mounted) setState({ error: message, status: "error", user: null });
      });
    }

    return () => {
      mounted = false;
      cleanupRefresh?.();
      unsubscribe?.();
    };
  }, [clientFactory]);

  async function signOut() {
    const client = clientRef.current;
    if (client === null) return;
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error !== null) {
      setState((current) => ({ ...current, error: "로그아웃하지 못했어요. 다시 시도해 주세요.", status: "error" }));
    }
  }

  return <AuthSessionContext.Provider value={{ ...state, signOut }}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
