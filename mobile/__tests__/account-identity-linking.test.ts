import { createAccountIdentityActions, normalizeAccountIdentities } from "../src/account-identity-linking";

describe("account identity linking", () => {
  it("normalizes only supported providers without trusting profile metadata", () => {
    expect(normalizeAccountIdentities([
      { id: "email-id", provider: "email" },
      { id: "google-id", provider: "google" },
      { id: "duplicate", provider: "google" },
      { id: "unknown", provider: "github" }
    ])).toEqual({ email: true, google: true, kakao: false });
  });

  it.each(["google", "kakao"] as const)("links %s inside the current authenticated user", async (provider) => {
    const auth = {
      exchangeCodeForSession: jest.fn(async () => ({ error: null })),
      getUser: jest.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
      getUserIdentities: jest.fn(async () => ({
        data: { identities: [{ id: `${provider}-id`, provider }] }, error: null
      })),
      linkIdentity: jest.fn(async () => ({ data: { url: "https://provider.example/link" }, error: null })),
      setSession: jest.fn(),
      signOut: jest.fn(async () => ({ error: null }))
    };
    const openAuthSession = jest.fn(async () => ({
      type: "success" as const,
      url: "ikkyee://auth/callback?code=link-code"
    }));
    const actions = createAccountIdentityActions(auth, "user-1", "ikkyee://auth/callback", openAuthSession);

    await expect(actions.link(provider)).resolves.toEqual({
      status: "linked",
      identities: { email: false, google: provider === "google", kakao: provider === "kakao" }
    });
    expect(auth.linkIdentity).toHaveBeenCalledWith({
      provider,
      options: {
        redirectTo: "ikkyee://auth/callback",
        skipBrowserRedirect: true,
        ...(provider === "kakao" ? { queryParams: { prompt: "login" } } : {})
      }
    });
    expect(auth.getUser).toHaveBeenCalled();
  });

  it("does not exchange a callback when the user cancels", async () => {
    const auth = {
      exchangeCodeForSession: jest.fn(),
      getUser: jest.fn(),
      getUserIdentities: jest.fn(),
      linkIdentity: jest.fn(async () => ({ data: { url: "https://provider.example/link" }, error: null })),
      setSession: jest.fn(),
      signOut: jest.fn(async () => ({ error: null }))
    };
    const actions = createAccountIdentityActions(auth, "user-1", "ikkyee://auth/callback", async () => ({ type: "cancel" }));

    await expect(actions.link("google")).resolves.toEqual({ status: "cancelled" });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("rejects a callback that changes the authenticated account", async () => {
    const auth = {
      exchangeCodeForSession: jest.fn(async () => ({ error: null })),
      getUser: jest.fn(async () => ({ data: { user: { id: "attacker-user" } }, error: null })),
      getUserIdentities: jest.fn(),
      linkIdentity: jest.fn(async () => ({ data: { url: "https://provider.example/link" }, error: null })),
      setSession: jest.fn(),
      signOut: jest.fn(async () => ({ error: null }))
    };
    const actions = createAccountIdentityActions(auth, "user-1", "ikkyee://auth/callback", async () => ({
      type: "success", url: "ikkyee://auth/callback?code=link-code"
    }));

    await expect(actions.link("google")).rejects.toThrow("계정 연결을 확인하지 못했습니다");
    expect(auth.getUserIdentities).not.toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("hides provider errors and rejects responses without a link URL", async () => {
    const auth = {
      exchangeCodeForSession: jest.fn(),
      getUser: jest.fn(),
      getUserIdentities: jest.fn(),
      linkIdentity: jest.fn(async () => ({ data: { url: null }, error: new Error("private provider detail") })),
      setSession: jest.fn(),
      signOut: jest.fn(async () => ({ error: null }))
    };
    const actions = createAccountIdentityActions(auth, "user-1", "ikkyee://auth/callback", jest.fn());

    await expect(actions.link("kakao")).rejects.toThrow("계정을 연결하지 못했습니다");
  });
});
