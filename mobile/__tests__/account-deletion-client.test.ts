import { deleteRemoteAccount } from "../src/account-deletion-client";

describe("account deletion client", () => {
  it("sends only the fixed confirmation to the privileged function", async () => {
    const invoke = jest.fn(async () => ({ data: { deleted: true }, error: null }));

    await expect(deleteRemoteAccount(invoke)).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith("delete-account", { body: { confirmation: "DELETE_ACCOUNT" } });
  });

  it("hides backend details and rejects malformed success responses", async () => {
    await expect(deleteRemoteAccount(async () => ({ data: null, error: new Error("service role detail") })))
      .rejects.toThrow("계정을 삭제하지 못했습니다.");
    await expect(deleteRemoteAccount(async () => ({ data: { deleted: false }, error: null })))
      .rejects.toThrow("계정을 삭제하지 못했습니다.");
  });
});
