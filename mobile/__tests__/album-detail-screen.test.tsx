import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AlbumDetailScreen } from "../src/AlbumDetailScreen";

const detail = {
  id: "album-a", ownerId: "owner-a", title: "제주 여행", note: "바다와 오름", visibility: "private" as const,
  coverImageUrl: null, dateStart: "2026-08-01", dateEnd: "2026-08-03", photoCount: 2,
  createdAt: "2026-08-04T00:00:00.000Z",
  photos: [{ id: "photo-a", description: "협재 바다", title: null, date: "2026-08-01", imageUrl: "https://example.com/a.jpg" }]
};

describe("album detail screen", () => {
  it("renders album story and opens a saved photo", async () => {
    const openPhoto = jest.fn();
    const screen = await render(
      <AlbumDetailScreen albumId="album-a" loadAlbum={async () => detail} openPhoto={openPhoto} ownerId="owner-a" />
    );
    await waitFor(() => expect(screen.getByText("제주 여행")).toBeOnTheScreen());
    expect(screen.getByText("바다와 오름")).toBeOnTheScreen();
    expect(screen.getByText("비공개 · 2장")).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "협재 바다 상세 보기" })));
    expect(openPhoto).toHaveBeenCalledWith("photo-a");
  });
});
