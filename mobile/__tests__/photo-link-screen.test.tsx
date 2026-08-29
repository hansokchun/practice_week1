import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { PhotoLinkScreen } from "../app/photo-link/[token]";
import { PhotoLinkLoadError } from "../src/photo-link-client";

describe("photo link screen", () => {
  it("renders a linked private photo without displaying its secret token", async () => {
    const token = "d".repeat(64);
    const loadPhoto = jest.fn(async () => ({
      id: "photo-a", date: "2026-08-24", description: "남산의 여름", liked: 0,
      ownerId: "owner-a", createdAt: "2026-08-24T10:00:00.000Z",
      imageUrl: "https://example.supabase.co/signed/photo-a"
    }));
    const { getByLabelText, getByText, queryByText } = await render(
      <PhotoLinkScreen loadPhoto={loadPhoto} token={token} />
    );

    await waitFor(() => expect(getByText("남산의 여름")).toBeOnTheScreen());
    expect(getByLabelText("공유받은 여행 사진")).toBeOnTheScreen();
    expect(loadPhoto).toHaveBeenCalledWith(token);
    expect(queryByText(token)).not.toBeOnTheScreen();
  });

  it("uses the same safe empty state for invalid and unavailable links", async () => {
    const { getByText } = await render(
      <PhotoLinkScreen loadPhoto={async () => { throw new Error("private backend detail"); }} token={"e".repeat(64)} />
    );

    await waitFor(() => expect(getByText("공유 사진을 열 수 없어요")).toBeOnTheScreen());
    expect(getByText("링크가 잘못되었거나 더 이상 사용할 수 없습니다.")).toBeOnTheScreen();
  });

  it("removes a cached linked photo when foreground validation revokes the link", async () => {
    const token = "f".repeat(64);
    const loadPhoto = jest.fn()
      .mockResolvedValueOnce({
        id: "photo-a", date: null, description: "잠시 공유", liked: 0, ownerId: "owner-a",
        createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a"
      })
      .mockRejectedValueOnce(new Error("revoked"));
    const screen = await render(<PhotoLinkScreen loadPhoto={loadPhoto} refreshKey={0} token={token} />);
    await waitFor(() => expect(screen.getByText("잠시 공유")).toBeOnTheScreen());

    await screen.rerender(<PhotoLinkScreen loadPhoto={loadPhoto} refreshKey={1} token={token} />);

    await waitFor(() => expect(screen.getByText("공유 사진을 열 수 없어요")).toBeOnTheScreen());
    expect(screen.queryByText("잠시 공유")).toBeNull();
    expect(screen.queryByLabelText("공유받은 여행 사진")).toBeNull();
  });

  it("offers a safe retry for a temporary network failure without calling an unavailable link invalid", async () => {
    const token = "a".repeat(64);
    const loadPhoto = jest.fn()
      .mockRejectedValueOnce(new PhotoLinkLoadError("retryable"))
      .mockResolvedValueOnce({
        id: "photo-a", date: null, description: "다시 연결됨", liked: 0, ownerId: "owner-a",
        createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a"
      });
    const screen = await render(<PhotoLinkScreen loadPhoto={loadPhoto} token={token} />);

    await waitFor(() => expect(screen.getByText("네트워크 연결을 확인해 주세요")).toBeOnTheScreen());
    expect(screen.queryByText("링크가 잘못되었거나 더 이상 사용할 수 없습니다.")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "공유 사진 다시 시도" }));
    await waitFor(() => expect(screen.getByText("다시 연결됨")).toBeOnTheScreen());
    expect(loadPhoto).toHaveBeenCalledTimes(2);
  });

  it("revalidates the secret link when its signed image fails", async () => {
    const token = "b".repeat(64);
    const linkedPhoto = {
      id: "photo-a", date: null, description: "링크 서명 갱신", liked: 0, ownerId: "owner-a",
      createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a"
    };
    const loadPhoto = jest.fn().mockResolvedValue(linkedPhoto);
    const screen = await render(<PhotoLinkScreen loadPhoto={loadPhoto} token={token} />);
    await waitFor(() => expect(screen.getByText("링크 서명 갱신")).toBeOnTheScreen());

    fireEvent(screen.getByLabelText("공유받은 여행 사진"), "error");
    await waitFor(() => expect(screen.getByRole("button", { name: "공유받은 여행 사진 다시 불러오기" })).toBeOnTheScreen());
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "공유받은 여행 사진 다시 불러오기" })));

    await waitFor(() => expect(loadPhoto).toHaveBeenCalledTimes(2));
  });
});
