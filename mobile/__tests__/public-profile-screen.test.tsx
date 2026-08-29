import { render, waitFor } from "@testing-library/react-native";

import { PublicProfileScreen } from "../app/public-profile/[userId]";

describe("public profile screen", () => {
  it("renders public profile copy and public photos without exposing the user id", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const loadProfile = jest.fn(async () => ({
      displayName: "여행자", bio: "천천히 걷습니다", avatarUrl: null,
      photos: [{ id: "photo-a", description: "한강 저녁", imageUrl: "https://example.supabase.co/signed/photo-a" }]
    }));
    const { getByLabelText, getByText, queryByText } = await render(
      <PublicProfileScreen loadProfile={loadProfile} userId={userId} />
    );

    await waitFor(() => expect(getByText("여행자")).toBeOnTheScreen());
    expect(getByText("천천히 걷습니다")).toBeOnTheScreen();
    expect(getByLabelText("한강 저녁")).toBeOnTheScreen();
    expect(queryByText(userId)).not.toBeOnTheScreen();
  });

  it("removes a cached profile photo after a focused public-scope refresh", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const loadProfile = jest.fn()
      .mockResolvedValueOnce({ displayName: "여행자", bio: "", avatarUrl: null, photos: [{ id: "photo-a", description: "이제 비공개", imageUrl: "https://example.supabase.co/signed/photo-a" }] })
      .mockResolvedValueOnce({ displayName: "여행자", bio: "", avatarUrl: null, photos: [] });
    const screen = await render(<PublicProfileScreen loadProfile={loadProfile} refreshKey={0} userId={userId} />);
    await waitFor(() => expect(screen.getByLabelText("이제 비공개")).toBeOnTheScreen());

    await screen.rerender(<PublicProfileScreen loadProfile={loadProfile} refreshKey={1} userId={userId} />);

    await waitFor(() => expect(screen.getByText("아직 공개한 사진이 없습니다.")).toBeOnTheScreen());
    expect(screen.queryByLabelText("이제 비공개")).toBeNull();
  });
});
