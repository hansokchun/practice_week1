import { bootstrapAuthSession, createEmailAuthActions } from "../src/email-auth";

describe("email authentication", () => {
  it("normalizes credentials and uses the mobile callback for sign-up", async () => {
    const auth = {
      resetPasswordForEmail: jest.fn(),
      signInWithPassword: jest.fn(async () => ({ data: {}, error: null })),
      signOut: jest.fn(),
      signUp: jest.fn(async () => ({ data: { session: null }, error: null }))
    };
    const actions = createEmailAuthActions(auth, "ikkyee://auth/callback");

    await actions.signUp("  USER@Example.COM ", "password123");

    expect(auth.signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      options: { emailRedirectTo: "ikkyee://auth/callback" },
      password: "password123"
    });
  });

  it("rejects invalid input before sending credentials", async () => {
    const auth = {
      resetPasswordForEmail: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn()
    };
    const actions = createEmailAuthActions(auth, "ikkyee://auth/callback");

    await expect(actions.signIn("not-an-email", "short")).rejects.toThrow("이메일");
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("marks password reset callbacks so PKCE links open the new-password screen", async () => {
    const auth = {
      resetPasswordForEmail: jest.fn(async () => ({ data: {}, error: null })),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn()
    };
    const actions = createEmailAuthActions(auth, "ikkyee://auth/callback");

    await actions.requestPasswordReset("user@example.com");

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "ikkyee://auth/callback?intent=password_recovery"
    });
  });

  it("verifies a restored session with the Auth server", async () => {
    const user = { email: "user@example.com", id: "user-1" };
    const auth = {
      getSession: jest.fn(async () => ({ data: { session: { access_token: "token" } }, error: null })),
      getUser: jest.fn(async () => ({ data: { user }, error: null }))
    };

    await expect(bootstrapAuthSession(auth)).resolves.toEqual({ status: "signed_in", user });
    expect(auth.getUser).toHaveBeenCalledTimes(1);
  });

  it("returns signed out without a network identity check when no session exists", async () => {
    const auth = {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      getUser: jest.fn()
    };

    await expect(bootstrapAuthSession(auth)).resolves.toEqual({ status: "signed_out", user: null });
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it("signs out only the current device session", async () => {
    const auth = {
      resetPasswordForEmail: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(async () => ({ error: null })),
      signUp: jest.fn()
    };
    const actions = createEmailAuthActions(auth, "ikkyee://auth/callback");

    await actions.signOut();

    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
