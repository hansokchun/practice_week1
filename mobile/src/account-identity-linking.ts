import { completeAuthCallback } from "./auth-callback";

export type LinkableAccountProvider = "google" | "kakao";
export type AccountIdentityState = { email: boolean; google: boolean; kakao: boolean };

type Identity = { id?: string; provider?: string };
type AccountIdentityAuthApi = {
  exchangeCodeForSession(code: string, options?: { flowId: string }): Promise<{ error: Error | null }>;
  getUser(): Promise<{ data: { user: { id: string } | null }; error: Error | null }>;
  getUserIdentities(): Promise<{ data: { identities: Identity[] } | null; error: Error | null }>;
  linkIdentity(credentials: {
    provider: LinkableAccountProvider;
    options: {
      queryParams?: { prompt: "login" };
      redirectTo: string;
      skipBrowserRedirect: true;
    };
  }): Promise<{ data: { url: string | null } | null; error: Error | null }>;
  setSession(tokens: { access_token: string; refresh_token: string }): Promise<{ error: Error | null }>;
  signOut(options: { scope: "local" }): Promise<{ error: Error | null }>;
};

type AuthSessionResult = { type: string; url?: string };
type OpenAuthSession = (authorizationUrl: string, redirectUrl: string) => Promise<AuthSessionResult>;

export type AccountIdentityActions = {
  load(): Promise<AccountIdentityState>;
  link(provider: LinkableAccountProvider): Promise<
    { status: "cancelled" } | { status: "linked"; identities: AccountIdentityState }
  >;
};

export function normalizeAccountIdentities(identities: readonly Identity[]): AccountIdentityState {
  const providers = new Set(identities.map((identity) => identity.provider));
  return {
    email: providers.has("email"),
    google: providers.has("google"),
    kakao: providers.has("kakao")
  };
}

export function createAccountIdentityActions(
  auth: AccountIdentityAuthApi,
  expectedUserId: string,
  callbackUrl: string,
  openAuthSession: OpenAuthSession
): AccountIdentityActions {
  async function load() {
    const result = await auth.getUserIdentities();
    if (result.error !== null || result.data === null) {
      throw new Error("연결된 로그인 방법을 확인하지 못했습니다.");
    }
    return normalizeAccountIdentities(result.data.identities);
  }

  return {
    load,
    async link(provider: LinkableAccountProvider) {
      const result = await auth.linkIdentity({
        provider,
        options: {
          redirectTo: callbackUrl,
          skipBrowserRedirect: true,
          ...(provider === "kakao" ? { queryParams: { prompt: "login" as const } } : {})
        }
      });
      if (result.error !== null || result.data?.url == null) {
        throw new Error("계정을 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }

      const browserResult = await openAuthSession(result.data.url, callbackUrl);
      if (browserResult.type !== "success" || browserResult.url === undefined) {
        return { status: "cancelled" as const };
      }

      try {
        await completeAuthCallback(auth, browserResult.url);
        const verified = await auth.getUser();
        if (verified.error !== null || verified.data.user?.id !== expectedUserId) {
          await auth.signOut({ scope: "local" });
          throw new Error("identity mismatch");
        }
        return { status: "linked" as const, identities: await load() };
      } catch {
        throw new Error("계정 연결을 확인하지 못했습니다. 다시 로그인해 주세요.");
      }
    }
  };
}
