import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { AppErrorBoundary } from "../src/AppErrorBoundary";

describe("AppErrorBoundary", () => {
  it("shows a safe recoverable screen and never renders the raw error", async () => {
    const report = jest.fn();
    let shouldFail = true;
    function Screen() {
      if (shouldFail) throw new Error("private provider response");
      return <Text>복구된 화면</Text>;
    }

    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const screen = await render(
      <AppErrorBoundary report={report}>
        <Screen />
      </AppErrorBoundary>
    );

    expect(screen.getByText("앱 화면을 열지 못했어요.")).toBeOnTheScreen();
    expect(screen.queryByText("private provider response")).toBeNull();
    expect(report).toHaveBeenCalledWith("ui-render-failure", "app-shell");

    shouldFail = false;
    fireEvent.press(screen.getByRole("button", { name: "앱 화면 다시 열기" }));
    await waitFor(() => expect(screen.getByText("복구된 화면")).toBeOnTheScreen());
    consoleError.mockRestore();
  });
});
