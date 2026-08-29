import { completeAuthCallback, requireTrustedAuthCallbackUrl } from "./auth-callback";

export type MobileOAuthProvider = "google" | "kakao";

type OAuthAuthApi = {
  exchangeCodeForSession(code: string, options?: { flowId: string }): Promise<{ error: Error | null }>;
  setSession(tokens: { access_token: string; refresh_token: string }): Promise<{ error: Error | null }>;
  signInWithOAuth(credentials: {
    provider: MobileOAuthProvider;
    options: {
      queryParams?: { prompt: "login" };
      redirectTo: string;
      skipBrowserRedirect: true;
    };
  }): Promise<{ data: { url: string | null }; error: Error | null }>;
};

type AuthSessionResult = { type: string; url?: string };
type OpenAuthSession = (authorizationUrl: string, redirectUrl: string) => Promise<AuthSessionResult>;

function throwAuthError(error: Error | null) {
  if (error !== null) throw error;
}

function requireSafeAuthorizationUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("OAuth 인증 URL을 확인하지 못했습니다.");
  }
  const loopbackHttp = url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "[::1]" || /^127(?:\.\d{1,3}){3}$/u.test(url.hostname));
  if ((url.protocol !== "https:" && !loopbackHttp) || url.username !== "" || url.password !== "") {
    throw new Error("OAuth 인증 URL을 확인하지 못했습니다.");
  }
  return url.toString();
}

export function createOAuthActions(auth: OAuthAuthApi, callbackUrl: string, openAuthSession: OpenAuthSession) {
  requireTrustedAuthCallbackUrl(callbackUrl);
  return {
    async signIn(provider: MobileOAuthProvider) {
      const result = await auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl,
          skipBrowserRedirect: true,
          ...(provider === "kakao" ? { queryParams: { prompt: "login" as const } } : {})
        }
      });
      throwAuthError(result.error);
      if (result.data.url === null) throw new Error("OAuth 인증 URL을 만들지 못했습니다.");
      const authorizationUrl = requireSafeAuthorizationUrl(result.data.url);

      const browserResult = await openAuthSession(authorizationUrl, callbackUrl);
      if (browserResult.type !== "success" || browserResult.url === undefined) return { status: "cancelled" as const };

      await completeAuthCallback(auth, browserResult.url);
      return { status: "signed_in" as const };
    }
  };
}
