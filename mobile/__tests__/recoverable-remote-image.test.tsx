import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { RecoverableRemoteImage } from "../src/RecoverableRemoteImage";

describe("RecoverableRemoteImage", () => {
  it("replaces a failed remote image with a safe retry action", async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <RecoverableRemoteImage accessibilityLabel="공개 여행 사진" onRetry={onRetry} uri="https://storage.example/signed/photo-a" />
    );

    fireEvent(screen.getByLabelText("공개 여행 사진"), "error");

    await waitFor(() => expect(screen.getByText("사진을 표시할 수 없어요")).toBeOnTheScreen());
    fireEvent.press(screen.getByRole("button", { name: "공개 여행 사진 다시 불러오기" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("resets the fallback when the signed image URL changes", async () => {
    const screen = await render(
      <RecoverableRemoteImage accessibilityLabel="공개 여행 사진" uri="https://storage.example/signed/photo-a" />
    );
    fireEvent(screen.getByLabelText("공개 여행 사진"), "error");
    await waitFor(() => expect(screen.getByText("사진을 표시할 수 없어요")).toBeOnTheScreen());

    screen.rerender(
      <RecoverableRemoteImage accessibilityLabel="공개 여행 사진" uri="https://storage.example/signed/photo-b" />
    );

    await waitFor(() => expect(screen.queryByText("사진을 표시할 수 없어요")).toBeNull());
    expect(screen.getByLabelText("공개 여행 사진")).toBeOnTheScreen();
  });
});
