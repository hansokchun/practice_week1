import { requireTrustedAuthCallbackUrl } from "./auth-callback";

type AuthResult = { data: object | null; error: Error | null };

type EmailAuthApi = {
  resetPasswordForEmail(email: string, options: { redirectTo: string }): Promise<AuthResult>;
  signInWithPassword(credentials: { email: string; password: string }): Promise<AuthResult>;
  signOut(options: { scope: "local" }): Promise<{ error: Error | null }>;
  signUp(credentials: {
    email: string;
    options: { emailRedirectTo: string };
    password: string;
  }): Promise<AuthResult>;
};

type SessionAuthApi = {
  getSession(): Promise<{ data: { session: unknown | null }; error: Error | null }>;
  getUser(): Promise<{ data: { user: unknown | null }; error: Error | null }>;
};

function normalizeEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized)) {
    throw new Error("올바른 이메일 주소를 입력해 주세요.");
  }
  return normalized;
}

function validatePassword(password: string) {
  if (password.length < 8) throw new Error("비밀번호는 8자 이상이어야 합니다.");
  return password;
}

function throwAuthError(error: Error | null) {
  if (error !== null) throw error;
}

function getPasswordRecoveryCallbackUrl(callbackUrl: string) {
  const url = new URL(callbackUrl);
  url.searchParams.set("intent", "password_recovery");
  return url.toString();
}

export function createEmailAuthActions(auth: EmailAuthApi, callbackUrl: string) {
  requireTrustedAuthCallbackUrl(callbackUrl);
  return {
    async requestPasswordReset(email: string) {
      const result = await auth.resetPasswordForEmail(normalizeEmail(email), {
        redirectTo: getPasswordRecoveryCallbackUrl(callbackUrl)
      });
      throwAuthError(result.error);
    },

    async signIn(email: string, password: string) {
      const result = await auth.signInWithPassword({ email: normalizeEmail(email), password: validatePassword(password) });
      throwAuthError(result.error);
      return result.data;
    },

    async signOut() {
      const result = await auth.signOut({ scope: "local" });
      throwAuthError(result.error);
    },

    async signUp(email: string, password: string) {
      const result = await auth.signUp({
        email: normalizeEmail(email),
        options: { emailRedirectTo: callbackUrl },
        password: validatePassword(password)
      });
      throwAuthError(result.error);
      const session = result.data !== null && "session" in result.data ? result.data.session : null;
      return { needsEmailVerification: session == null };
    }
  };
}

export async function bootstrapAuthSession(auth: SessionAuthApi) {
  const sessionResult = await auth.getSession();
  throwAuthError(sessionResult.error);
  if (sessionResult.data.session === null) return { status: "signed_out" as const, user: null };

  const userResult = await auth.getUser();
  throwAuthError(userResult.error);
  if (userResult.data.user === null) return { status: "signed_out" as const, user: null };
  return { status: "signed_in" as const, user: userResult.data.user };
}
