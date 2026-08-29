import { completeAuthCallback, updateRecoveredPassword } from "../src/auth-callback";

describe("mobile auth callback", () => {
  it("exchanges a one-time PKCE code and preserves recovery intent", async () => {
    const auth = {
      exchangeCodeForSession: jest.fn(async () => ({ error: null })),
      setSession: jest.fn()
    };

    await expect(completeAuthCallback(auth, "ikkyee://auth/callback?code=one-time-code&type=recovery&sb_flow_id=flow-1"))
      .resolves.toEqual({ intent: "password_recovery" });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("one-time-code", { flowId: "flow-1" });
    expect(auth.setSession).not.toHaveBeenCalled();
  });

  it("accepts native implicit tokens from the URL fragment", async () => {
    const auth = {
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(async () => ({ error: null }))
    };

    await expect(completeAuthCallback(auth, "ikkyee://auth/callback#access_token=access&refresh_token=refresh&type=signup"))
      .resolves.toEqual({ intent: "signed_in" });
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: "access", refresh_token: "refresh" });
  });

  it("preserves an explicit recovery intent when a PKCE redirect only adds a code", async () => {
    const auth = {
      exchangeCodeForSession: jest.fn(async () => ({ error: null })),
      setSession: jest.fn()
    };

    await expect(completeAuthCallback(auth, "ikkyee://auth/callback?intent=password_recovery&code=one-time-code"))
      .resolves.toEqual({ intent: "password_recovery" });
  });

  it("surfaces provider errors without attempting a session", async () => {
    const auth = { exchangeCodeForSession: jest.fn(), setSession: jest.fn() };

    await expect(completeAuthCallback(auth, "ikkyee://auth/callback#error=access_denied&error_description=Link%20expired"))
      .rejects.toThrow("인증 요청을 완료하지 못했습니다");
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it.each([
    "https://attacker.example/auth/callback?code=stolen",
    "ikkyee://evil/callback?code=stolen",
    "ikkyee://auth/other?code=stolen",
    "ikkyee://user@auth/callback?code=stolen"
  ])("rejects an untrusted callback target before consuming credentials: %s", async (callbackUrl) => {
    const auth = { exchangeCodeForSession: jest.fn(), setSession: jest.fn() };

    await expect(completeAuthCallback(auth, callbackUrl)).rejects.toThrow("올바르지 않은 인증 링크");
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(auth.setSession).not.toHaveBeenCalled();
  });

  it("validates matching passwords before updating the authenticated user", async () => {
    const auth = { updateUser: jest.fn(async () => ({ error: null })) };

    await expect(updateRecoveredPassword(auth, "new-password", "different-password")).rejects.toThrow("일치");
    expect(auth.updateUser).not.toHaveBeenCalled();

    await updateRecoveredPassword(auth, "new-password", "new-password");
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "new-password" });
  });
});
