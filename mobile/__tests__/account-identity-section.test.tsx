import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AccountIdentitySection } from "../src/AccountIdentitySection";

describe("AccountIdentitySection", () => {
  it("shows current methods and links a missing provider without offering unlink", async () => {
    const actions = {
      load: jest.fn(async () => ({ email: true, google: true, kakao: false })),
      link: jest.fn(async () => ({
        status: "linked" as const,
        identities: { email: true, google: true, kakao: true }
      }))
    };
    const screen = await render(<AccountIdentitySection actions={actions} />);

    await waitFor(() => expect(screen.getByText("Google 연결됨")).toBeOnTheScreen());
    expect(screen.getByRole("button", { name: "Kakao 계정 연결" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /연결 해제/u })).toBeNull();

    await act(async () => fireEvent.press(screen.getByRole("button", { name: "Kakao 계정 연결" })));
    await waitFor(() => expect(actions.link).toHaveBeenCalledWith("kakao"));
    await waitFor(() => expect(screen.getByText("Kakao 연결됨")).toBeOnTheScreen());
  });

  it("keeps provider details private when loading fails", async () => {
    const actions = {
      load: jest.fn(async () => { throw new Error("private provider detail"); }),
      link: jest.fn()
    };
    const screen = await render(<AccountIdentitySection actions={actions} />);

    await waitFor(() => expect(screen.getByText("로그인 방법을 확인하지 못했어요. 다시 시도해 주세요.")).toBeOnTheScreen());
    expect(screen.queryByText(/private provider/u)).toBeNull();
  });
});
