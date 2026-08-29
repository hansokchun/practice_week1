type CallbackAuthApi = {
  exchangeCodeForSession(code: string, options?: { flowId: string }): Promise<{ error: Error | null }>;
  setSession(tokens: { access_token: string; refresh_token: string }): Promise<{ error: Error | null }>;
};

type PasswordAuthApi = {
  updateUser(attributes: { password: string }): Promise<{ error: Error | null }>;
};

function getCallbackParams(callbackUrl: string) {
  const parsedUrl = requireTrustedAuthCallbackUrl(callbackUrl);
  const params = new URLSearchParams(parsedUrl.search);
  const fragmentParams = new URLSearchParams(parsedUrl.hash.replace(/^#/u, ""));

  fragmentParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  return params;
}

export function requireTrustedAuthCallbackUrl(callbackUrl: string): URL {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(callbackUrl);
  } catch {
    throw new Error("올바르지 않은 인증 링크입니다.");
  }
  if (parsedUrl.protocol !== "ikkyee:" || parsedUrl.hostname !== "auth" ||
    parsedUrl.pathname !== "/callback" || parsedUrl.username !== "" ||
    parsedUrl.password !== "" || parsedUrl.port !== "") {
    throw new Error("올바르지 않은 인증 링크입니다.");
  }
  return parsedUrl;
}

function throwAuthError(error: Error | null) {
  if (error !== null) throw error;
}

export async function completeAuthCallback(auth: CallbackAuthApi, callbackUrl: string) {
  const params = getCallbackParams(callbackUrl);
  const callbackError = params.get("error_description") ?? params.get("error") ?? params.get("error_code");
  if (callbackError !== null) throw new Error("인증 요청을 완료하지 못했습니다. 다시 시도해 주세요.");

  const isPasswordRecovery = params.get("type") === "recovery" || params.get("intent") === "password_recovery";
  const intent = isPasswordRecovery ? "password_recovery" as const : "signed_in" as const;
  const code = params.get("code");
  if (code !== null) {
    const flowId = params.get("sb_flow_id");
    const result = await auth.exchangeCodeForSession(code, flowId === null ? undefined : { flowId });
    throwAuthError(result.error);
    return { intent };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken !== null && refreshToken !== null) {
    const result = await auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    throwAuthError(result.error);
    return { intent };
  }

  throw new Error("인증 링크에 필요한 정보가 없습니다. 새 링크를 요청해 주세요.");
}

export async function updateRecoveredPassword(auth: PasswordAuthApi, password: string, confirmation: string) {
  validateRecoveredPasswordInput(password, confirmation);

  const result = await auth.updateUser({ password });
  throwAuthError(result.error);
}

export function validateRecoveredPasswordInput(password: string, confirmation: string) {
  if (password.length < 8) throw new Error("비밀번호는 8자 이상이어야 합니다.");
  if (password !== confirmation) throw new Error("비밀번호가 일치하지 않습니다.");
}
