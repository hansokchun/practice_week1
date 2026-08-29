import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ProfilePublicSummary } from "../src/ProfilePublicSummary";

const userId = "11111111-1111-4111-8111-111111111111";

describe("signed-in profile public photo summary", () => {
  it("shows the public count and opens a recent public photo", async () => {
    const openPhoto = jest.fn();
    const screen = await render(<ProfilePublicSummary
      loadProfile={async () => ({
        displayName: "여행자", bio: "", avatarUrl: null,
        photos: [{ id: "photo-a", description: "한강 저녁", imageUrl: "https://storage.example/photo-a" }]
      })}
      openPhoto={openPhoto}
      userId={userId}
    />);

    await waitFor(() => expect(screen.getByText("최근 공개 사진 1장")).toBeOnTheScreen());
    fireEvent.press(screen.getByRole("button", { name: "한강 저녁 공개 사진 열기" }));
    expect(openPhoto).toHaveBeenCalledWith("photo-a");
  });

  it("shows a safe retry state without backend details", async () => {
    const screen = await render(<ProfilePublicSummary
      loadProfile={async () => { throw new Error("private storage detail"); }}
      userId={userId}
    />);
    await waitFor(() => expect(screen.getByText("공개 사진 요약을 불러오지 못했어요.")).toBeOnTheScreen());
    expect(screen.queryByText(/private storage detail/)).toBeNull();
    expect(screen.getByRole("button", { name: "공개 사진 요약 다시 시도" })).toBeOnTheScreen();
  });

  it("removes a cached own-profile photo after a profile refresh", async () => {
    const loadProfile = jest.fn()
      .mockResolvedValueOnce({ displayName: "여행자", bio: "", avatarUrl: null, photos: [{ id: "photo-a", description: "삭제 예정", imageUrl: "https://storage.example/photo-a" }] })
      .mockResolvedValueOnce({ displayName: "여행자", bio: "", avatarUrl: null, photos: [] });
    const screen = await render(<ProfilePublicSummary loadProfile={loadProfile} refreshKey={0} userId={userId} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "삭제 예정 공개 사진 열기" })).toBeOnTheScreen());

    await screen.rerender(<ProfilePublicSummary loadProfile={loadProfile} refreshKey={1} userId={userId} />);

    await waitFor(() => expect(screen.getByText("아직 공개한 사진이 없습니다.")).toBeOnTheScreen());
    expect(screen.queryByRole("button", { name: "삭제 예정 공개 사진 열기" })).toBeNull();
  });
});
