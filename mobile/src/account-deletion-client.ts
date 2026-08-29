import { getSupabaseClient } from "./supabase-client";

type FunctionResult = {
  readonly data: unknown;
  readonly error: unknown;
};

type InvokeFunction = (
  name: string,
  options: { readonly body: { readonly confirmation: "DELETE_ACCOUNT" } }
) => PromiseLike<FunctionResult>;

const DELETE_ERROR = "계정을 삭제하지 못했습니다.";

export async function deleteRemoteAccount(
  invoke: InvokeFunction = (name, options) => getSupabaseClient().functions.invoke(name, options)
): Promise<void> {
  try {
    const { data, error } = await invoke("delete-account", {
      body: { confirmation: "DELETE_ACCOUNT" }
    });
    if (
      error !== null ||
      typeof data !== "object" ||
      data === null ||
      (data as Record<string, unknown>)["deleted"] !== true
    ) throw new Error(DELETE_ERROR);
  } catch {
    throw new Error(DELETE_ERROR);
  }
}
