import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { SettingsScreen } from "../app/settings";

describe("mobile settings screen", () => {
  const userId = "11111111-1111-4111-8111-111111111111";

  it("saves the publication default and submits feedback", async () => {
    const saveSettings = jest.fn(async () => undefined);
    const submitFeedback = jest.fn(async () => undefined);
    const screen = await render(
      <SettingsScreen
        email="traveler@example.com"
        loadSettings={async () => ({ defaultVisibility: "private" })}
        onEditProfile={jest.fn()}
        onSignOut={jest.fn(async () => undefined)}
        saveSettings={saveSettings}
        showAccountSections={false}
        submitFeedback={submitFeedback}
        userId={userId}
      />
    );

    await waitFor(() => expect(screen.getByTestId("default-public").props["accessibilityState"]).toEqual({ selected: false }));
    await act(async () => fireEvent.press(screen.getByTestId("default-public")));
    expect(saveSettings).toHaveBeenCalledWith(userId, { defaultVisibility: "public" });

    await act(async () => fireEvent.changeText(screen.getByTestId("feedback-message"), "Photo loading could be smoother."));
    await act(async () => fireEvent.press(screen.getByTestId("feedback-submit")));
    await waitFor(() => expect(submitFeedback).toHaveBeenCalledWith(userId, expect.objectContaining({
      category: "usability",
      message: "Photo loading could be smoother.",
      pagePath: "/settings"
    })));
    expect(screen.getByTestId("feedback-success")).toBeOnTheScreen();
  });
});
