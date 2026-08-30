import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { MyAlbumsScreen } from "../src/MyAlbumsScreen";

const albums = [{
  id: "album-a", ownerId: "owner-a", title: "제주 여행", note: "바다와 오름", visibility: "private" as const,
  coverImageUrl: "https://example.com/cover.jpg", dateStart: "2026-08-01", dateEnd: "2026-08-03",
  photoCount: 12, createdAt: "2026-08-04T00:00:00.000Z"
}];

describe("my albums screen", () => {
  it("shows read-only web albums inside the My Photos flow", async () => {
    const openAlbum = jest.fn();
    const screen = await render(
      <MyAlbumsScreen loadAlbums={async () => albums} openAlbum={openAlbum} ownerId="owner-a" />
    );
    await waitFor(() => expect(screen.getByText("제주 여행")).toBeOnTheScreen());
    expect(screen.getByText("12장 · 2026.08.01 - 2026.08.03")).toBeOnTheScreen();
    expect(screen.getByText("웹에서 만든 앨범을 안전하게 둘러보세요.")).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "제주 여행 앨범 열기" })));
    expect(openAlbum).toHaveBeenCalledWith("album-a");
  });
});
