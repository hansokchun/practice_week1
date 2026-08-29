import { createOAuthActions } from "../src/oauth-auth";

describe("mobile OAuth", () => {
  it.each(["google", "kakao"] as const)("opens %s in an auth session and completes the callback", async (provider) => {
    const auth = {
      exchangeCodeForSession: jest.fn(async () => ({ error: null })),
      setSession: jest.fn(),
      signInWithOAuth: jest.fn(async () => ({ data: { url: "https://provider.example/authorize" }, error: null }))
    };
    const openAuthSession = jest.fn(async () => ({ type: "success" as const, url: "ikkyee://auth/callback?code=oauth-code" }));
    const actions = createOAuthActions(auth, "ikkyee://auth/callback", openAuthSession);

    await expect(actions.signIn(provider)).resolves.toEqual({ status: "signed_in" });
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider,
      options: {
        redirectTo: "ikkyee://auth/callback",
        skipBrowserRedirect: true,
        ...(provider === "kakao" ? { queryParams: { prompt: "login" } } : {})
      }
    });
    expect(openAuthSession).toHaveBeenCalledWith("https://provider.example/authorize", "ikkyee://auth/callback");
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("oauth-code", undefined);
  });

  it("returns a cancelled result without creating a callback session", async () => {
    const auth = {
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
      signInWithOAuth: jest.fn(async () => ({ data: { url: "https://provider.example/authorize" }, error: null }))
    };
    const actions = createOAuthActions(auth, "ikkyee://auth/callback", async () => ({ type: "cancel" }));

    await expect(actions.signIn("google")).resolves.toEqual({ status: "cancelled" });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("rejects a provider response without an authorization URL", async () => {
    const auth = {
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
      signInWithOAuth: jest.fn(async () => ({ data: { url: null }, error: null }))
    };
    const actions = createOAuthActions(auth, "ikkyee://auth/callback", jest.fn());

    await expect(actions.signIn("google")).rejects.toThrow("URL");
  });

  it.each([
    "javascript:alert(1)",
    "http://provider.example/authorize",
    "https://user:secret@provider.example/authorize"
  ])("rejects an unsafe provider authorization URL before opening a browser: %s", async (authorizationUrl) => {
    const auth = {
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
      signInWithOAuth: jest.fn(async () => ({ data: { url: authorizationUrl }, error: null }))
    };
    const openAuthSession = jest.fn();
    const actions = createOAuthActions(auth, "ikkyee://auth/callback", openAuthSession);

    await expect(actions.signIn("google")).rejects.toThrow("OAuth 인증 URL");
    expect(openAuthSession).not.toHaveBeenCalled();
  });

  it("allows a loopback HTTP authorization URL only for local development", async () => {
    const auth = {
      exchangeCodeForSession: jest.fn(async () => ({ error: null })),
      setSession: jest.fn(),
      signInWithOAuth: jest.fn(async () => ({ data: { url: "http://127.0.0.1:54321/auth/v1/authorize" }, error: null }))
    };
    const openAuthSession = jest.fn(async () => ({ type: "success" as const, url: "ikkyee://auth/callback?code=local-code" }));
    const actions = createOAuthActions(auth, "ikkyee://auth/callback", openAuthSession);

    await expect(actions.signIn("google")).resolves.toEqual({ status: "signed_in" });
    expect(openAuthSession).toHaveBeenCalled();
  });
});
