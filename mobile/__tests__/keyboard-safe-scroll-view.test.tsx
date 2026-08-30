import { render } from "@testing-library/react-native";
import { Platform, Text } from "react-native";

import { KeyboardSafeScrollView, getKeyboardAvoidingBehavior } from "../src/KeyboardSafeScrollView";

describe("keyboard-safe mobile layouts", () => {
  it("uses platform-appropriate keyboard avoidance", () => {
    expect(getKeyboardAvoidingBehavior("ios")).toBe("padding");
    expect(getKeyboardAvoidingBehavior("android")).toBe("height");
    expect(getKeyboardAvoidingBehavior("web")).toBeUndefined();
  });

  it("keeps scrollable inputs reachable while the keyboard is open", async () => {
    const screen = await render(
      <KeyboardSafeScrollView testID="keyboard-safe-content">
        <Text>input content</Text>
      </KeyboardSafeScrollView>
    );

    const scrollView = screen.getByTestId("keyboard-safe-content");
    expect(scrollView.props["automaticallyAdjustKeyboardInsets"]).toBe(false);
    expect(scrollView.props["keyboardDismissMode"]).toBe(Platform.OS === "ios" ? "interactive" : "on-drag");
    expect(scrollView.props["keyboardShouldPersistTaps"]).toBe("handled");
  });
});
