import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { UpdatePasswordScreen } from "../app/auth/update-password";

describe("password recovery screen", () => {
  it("validates confirmation locally and only offers profile navigation after a successful update", async () => {
    const updatePassword = jest.fn(async () => undefined);
    const goToProfile = jest.fn();
    const screen = await render(
      <UpdatePasswordScreen goToProfile={goToProfile} updatePassword={updatePassword} />
    );

    await fireEvent.changeText(screen.getByLabelText("새 비밀번호"), "new-password");
    await fireEvent.changeText(screen.getByLabelText("새 비밀번호 확인"), "different-password");
    await fireEvent.press(screen.getByRole("button", { name: "비밀번호 저장" }));
    await waitFor(() => expect(screen.getByText("비밀번호가 일치하지 않습니다.")).toBeOnTheScreen());
    expect(updatePassword).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText("새 비밀번호 확인"), "new-password");
    await fireEvent.press(screen.getByRole("button", { name: "비밀번호 저장" }));
    await waitFor(() => expect(screen.getByText("새 비밀번호가 저장되었습니다.")).toBeOnTheScreen());
    expect(updatePassword).toHaveBeenCalledWith("new-password", "new-password");
    await fireEvent.press(screen.getByRole("button", { name: "프로필로 이동" }));
    expect(goToProfile).toHaveBeenCalledTimes(1);
  });

  it("keeps the form recoverable and hides raw provider errors", async () => {
    const screen = await render(
      <UpdatePasswordScreen
        updatePassword={async () => { throw new Error("provider internals"); }}
      />
    );
    await fireEvent.changeText(screen.getByLabelText("새 비밀번호"), "new-password");
    await fireEvent.changeText(screen.getByLabelText("새 비밀번호 확인"), "new-password");
    await fireEvent.press(screen.getByRole("button", { name: "비밀번호 저장" }));
    await waitFor(() => expect(screen.getByText("비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.")).toBeOnTheScreen());
    expect(screen.queryByText("provider internals")).toBeNull();
    expect(screen.getByRole("button", { name: "비밀번호 저장" })).toBeOnTheScreen();
  });
});
