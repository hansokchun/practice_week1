import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

const mockPush = jest.fn();

import { ExploreScreen } from "../app/(tabs)/index";
import { LikesScreen } from "../app/(tabs)/likes";
import { ProfileScreen } from "../app/profile";
import { AuthSessionContext } from "../src/auth-session";

describe("guest navigation", () => {
  beforeEach(() => {
    mockPush.mockClear();
    router.push = mockPush;
  });

  it("opens profile from Explore", async () => {
    const { getByLabelText } = await render(<ExploreScreen />);

    fireEvent.press(getByLabelText("프로필 열기"));

    expect(mockPush).toHaveBeenCalledWith("/profile");
  });

  it.each([
    ["likes", <LikesScreen />],
    ["profile", <ProfileScreen />]
  ])("opens login from %s", async (_name, screen) => {
    const { getByRole } = await render(screen);

    fireEvent.press(getByRole("button", { name: "로그인하기" }));

    expect(mockPush).toHaveBeenCalledWith("/auth/login");
  });

  it("never renders a raw authentication provider error on the profile screen", async () => {
    const screen = await render(
      <AuthSessionContext.Provider value={{
        error: "Invalid JWT: private provider detail",
        signOut: async () => undefined,
        status: "error",
        user: null
      }}>
        <ProfileScreen />
      </AuthSessionContext.Provider>
    );

    expect(screen.getByText("로그인 상태를 확인하지 못했어요. 다시 로그인해 주세요.")).toBeOnTheScreen();
    expect(screen.queryByText(/Invalid JWT|provider detail/u)).toBeNull();
  });
});
