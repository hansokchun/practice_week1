import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccountDeletionSection } from "../src/AccountDeletionSection";

describe("account deletion settings", () => {
  it("requires the exact visible confirmation before local and remote deletion", async () => {
    const calls: string[] = [];
    const screen = await render(<AccountDeletionSection
      clearLocalData={async () => { calls.push("local"); }}
      deleteAccount={async () => { calls.push("remote"); }}
      finish={async () => { calls.push("finish"); }}
    />);

    await act(async () => { fireEvent.press(screen.getByRole("button", { name: "계정 삭제 시작" })); });
    expect(screen.getByRole("button", { name: "계정 영구 삭제" })).toBeDisabled();
    await act(async () => { fireEvent.changeText(screen.getByLabelText("계정 삭제 확인 문구"), "계정 삭제"); });
    await waitFor(() => expect(screen.getByRole("button", { name: "계정 영구 삭제" })).toBeEnabled());
    await act(async () => { fireEvent.press(screen.getByRole("button", { name: "계정 영구 삭제" })); });
    await waitFor(() => expect(calls).toEqual(["local", "remote", "finish"]));
  });

  it("keeps a safe retry surface when deletion fails", async () => {
    const screen = await render(<AccountDeletionSection
      clearLocalData={async () => {}}
      deleteAccount={async () => { throw new Error("private backend detail"); }}
    />);
    await act(async () => { fireEvent.press(screen.getByRole("button", { name: "계정 삭제 시작" })); });
    await act(async () => { fireEvent.changeText(screen.getByLabelText("계정 삭제 확인 문구"), "계정 삭제"); });
    await act(async () => { fireEvent.press(screen.getByRole("button", { name: "계정 영구 삭제" })); });
    await waitFor(() => expect(screen.getByText("계정을 삭제하지 못했어요. 다시 시도해 주세요.")).toBeOnTheScreen());
    expect(screen.queryByText(/private backend detail/)).toBeNull();
  });
});
