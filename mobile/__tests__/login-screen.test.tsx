import { act, fireEvent, render } from "@testing-library/react-native";

import LoginScreen from "../app/auth/login";

describe("LoginScreen", () => {
  it("offers exactly the approved guest authentication methods", async () => {
    const { getByRole, getByText, queryByText } = await render(<LoginScreen />);

    expect(getByText("로그인")).toBeOnTheScreen();
    expect(getByRole("button", { name: "이메일로 계속하기" })).toBeOnTheScreen();
    expect(getByRole("button", { name: "Google로 계속하기" })).toBeOnTheScreen();
    expect(getByRole("button", { name: "Kakao로 계속하기" })).toBeOnTheScreen();
    expect(queryByText("여행 기록을 이어가세요")).toBeNull();
    expect(queryByText(/첫 배포 전|공급자 설정|실기기 리디렉션/u)).toBeNull();
  });

  it("opens the email form with login, sign-up, and recovery actions", async () => {
    const { getByLabelText, getByRole } = await render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "이메일로 계속하기" }));
    });

    expect(getByLabelText("이메일")).toBeOnTheScreen();
    expect(getByLabelText("비밀번호")).toBeOnTheScreen();
    expect(getByRole("button", { name: "로그인" })).toBeOnTheScreen();
    expect(getByRole("button", { name: "회원가입" })).toBeOnTheScreen();
    expect(getByRole("button", { name: "비밀번호 재설정 메일 보내기" })).toBeOnTheScreen();
  });
});
