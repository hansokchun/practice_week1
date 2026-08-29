import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { LikesScreen } from "../app/(tabs)/likes";

const likedPhoto = {
  id: "photo-a", date: "2026-08-24", description: "한강 저녁",
  imageUrl: "https://example.supabase.co/signed/photo-a", createdAt: "2026-08-24T10:00:00.000Z"
};

describe("likes screen", () => {
  it("loads liked public photos and opens their detail", async () => {
    const openPhoto = jest.fn();
    const { getByLabelText, getByText } = await render(
      <LikesScreen loadPhotos={async () => [likedPhoto]} openPhoto={openPhoto} signedIn />
    );

    await waitFor(() => expect(getByText("한강 저녁")).toBeOnTheScreen());
    fireEvent.press(getByLabelText("한강 저녁 상세 열기"));
    expect(openPhoto).toHaveBeenCalledWith("photo-a");
  });

  it("optimistically removes an unliked photo and restores it when the mutation fails", async () => {
    const updateLike = jest.fn(async () => { throw new Error("private rpc detail"); });
    const { getByRole, getByText, queryByText } = await render(
      <LikesScreen loadPhotos={async () => [likedPhoto]} signedIn updateLike={updateLike} />
    );
    await waitFor(() => expect(getByText("한강 저녁")).toBeOnTheScreen());

    await act(async () => fireEvent.press(getByRole("button", { name: "한강 저녁 좋아요 취소" })));
    await waitFor(() => expect(getByText("좋아요를 변경하지 못했어요. 다시 시도해 주세요.")).toBeOnTheScreen());
    expect(queryByText("private rpc detail")).not.toBeOnTheScreen();
    expect(getByText("한강 저녁")).toBeOnTheScreen();
  });

  it("removes a cached card when a focused refresh no longer returns a public photo", async () => {
    const loadPhotos = jest.fn()
      .mockResolvedValueOnce([likedPhoto])
      .mockResolvedValueOnce([]);
    const screen = await render(<LikesScreen loadPhotos={loadPhotos} refreshKey={0} signedIn />);
    await waitFor(() => expect(screen.getByText("한강 저녁")).toBeOnTheScreen());

    await screen.rerender(<LikesScreen loadPhotos={loadPhotos} refreshKey={1} signedIn />);

    await waitFor(() => expect(screen.getByText("아직 좋아요 한 공개 사진이 없어요")).toBeOnTheScreen());
    expect(screen.queryByText("한강 저녁")).toBeNull();
    expect(loadPhotos).toHaveBeenCalledTimes(2);
  });

  it("refreshes liked photo signed URLs after an image load failure", async () => {
    const loadPhotos = jest.fn().mockResolvedValue([likedPhoto]);
    const screen = await render(<LikesScreen loadPhotos={loadPhotos} signedIn />);
    await waitFor(() => expect(screen.getByText("한강 저녁")).toBeOnTheScreen());

    fireEvent(screen.getByLabelText("한강 저녁 이미지"), "error");
    await waitFor(() => expect(screen.getByRole("button", { name: "한강 저녁 이미지 다시 불러오기" })).toBeOnTheScreen());
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "한강 저녁 이미지 다시 불러오기" })));

    await waitFor(() => expect(loadPhotos).toHaveBeenCalledTimes(2));
  });
});
