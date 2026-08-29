import { act, render } from "@testing-library/react-native";
import { AppState, type AppStateStatus, Text } from "react-native";

let mockFocusEffect: (() => void | (() => void)) | null = null;

jest.mock("expo-router", () => ({
  useFocusEffect(effect: () => void | (() => void)) {
    mockFocusEffect = effect;
  }
}));

import {
  SIGNED_URL_REFRESH_INTERVAL_MS,
  useContentVisibilityRefreshKey
} from "../src/content-visibility-refresh";

function Harness() {
  const refreshKey = useContentVisibilityRefreshKey();
  return <Text>{refreshKey}</Text>;
}

describe("content visibility refresh", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("increments after returning to an already visited screen", async () => {
    const screen = await render(<Harness />);
    expect(mockFocusEffect).not.toBeNull();
    if (mockFocusEffect === null) throw new Error("focus callback missing");
    const cleanup = mockFocusEffect();
    expect(screen.getByText("0")).toBeOnTheScreen();
    if (typeof cleanup === "function") cleanup();

    await act(async () => { mockFocusEffect?.(); });

    expect(screen.getByText("1")).toBeOnTheScreen();
  });

  it("increments when the focused app returns to the foreground", async () => {
    let listener: ((state: AppStateStatus) => void) | null = null;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, nextListener) => {
      listener = nextListener;
      return { remove: jest.fn() };
    });
    const screen = await render(<Harness />);
    await act(async () => { mockFocusEffect?.(); });

    await act(async () => {
      listener?.("background");
      listener?.("active");
    });

    expect(screen.getByText("1")).toBeOnTheScreen();
  });

  it("renews signed image data before a five-minute URL expires while focused", async () => {
    jest.useFakeTimers();
    const screen = await render(<Harness />);
    await act(async () => { mockFocusEffect?.(); });

    await act(async () => { jest.advanceTimersByTime(SIGNED_URL_REFRESH_INTERVAL_MS - 1); });
    expect(screen.getByText("0")).toBeOnTheScreen();

    await act(async () => { jest.advanceTimersByTime(1); });
    expect(screen.getByText("1")).toBeOnTheScreen();
  });

  it("does not renew signed image data while the screen is unfocused", async () => {
    jest.useFakeTimers();
    const screen = await render(<Harness />);
    const cleanup = mockFocusEffect?.();
    if (typeof cleanup === "function") cleanup();

    await act(async () => { jest.advanceTimersByTime(SIGNED_URL_REFRESH_INTERVAL_MS); });

    expect(screen.getByText("0")).toBeOnTheScreen();
  });
});
