import { fireEvent, render } from "@testing-library/react-native";
import { AppNavigation } from "../src/AppNavigation";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 })
}));

describe("app navigation", () => {
  it("selects the active destination and navigates without duplicating it", async () => {
    const navigate = jest.fn();
    const screen = await render(<AppNavigation pathname="/" navigate={navigate} />);
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByRole("tab", { name: "발견", selected: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("tab", { name: "발견" }));
    expect(navigate).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("tab", { name: "지도" }));
    expect(navigate).toHaveBeenCalledWith("/explore");
  });

  it.each(["/auth/login", "/explore-photo/photo-a", "/settings"])("keeps %s focused without the bottom menu", async (pathname) => {
    const screen = await render(<AppNavigation pathname={pathname} navigate={jest.fn()} />);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });
});
