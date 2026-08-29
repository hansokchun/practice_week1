import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { PublicPhotoDetailScreen } from "../app/explore-photo/[photoId]";

const photo = {
  id: "photo-a", date: "2026-08-24", description: "한강 저녁", liked: 7,
  owner: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", displayName: "여행자", avatarUrl: null },
  createdAt: "2026-08-24T10:00:00.000Z", imageUrl: "https://example.supabase.co/signed/photo-a",
  locationPrecision: "hidden" as const, viewerHasLiked: false
};
const currentUserId = "11111111-1111-4111-8111-111111111111";

describe("public photo detail comments", () => {
  it("loads comments and lets a signed-in user write a trimmed comment", async () => {
    const submitComment = jest.fn(async (_photoId: string, authorId: string, text: string) => ({
      id: 2, text, date: "2026-08-24T12:00:00.000Z", author: { id: authorId, displayName: "나" }
    }));
    const { getByLabelText, getByRole, getByText } = await render(
      <PublicPhotoDetailScreen
        currentUserId={currentUserId}
        loadComments={async () => [{ id: 1, text: "멋져요", date: "2026-08-24T11:00:00.000Z", author: { id: "22222222-2222-4222-8222-222222222222", displayName: "산책자" } }]}
        loadPhoto={async () => photo}
        photoId="photo-a"
        submitComment={submitComment}
      />
    );

    await waitFor(() => expect(getByText("멋져요")).toBeOnTheScreen());
    fireEvent.changeText(getByLabelText("댓글 내용"), "  반가워요  ");
    await waitFor(() => expect(getByLabelText("댓글 내용")).toHaveProp("value", "  반가워요  "));
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "댓글 작성" }));
      await Promise.resolve();
    });
    await waitFor(() => expect(getByText("반가워요")).toBeOnTheScreen());
    expect(submitComment).toHaveBeenCalledWith("photo-a", currentUserId, "반가워요");
  });

  it("shows delete only for the current user's comment and restores it after failure", async () => {
    const removeComment = jest.fn(async () => { throw new Error("database detail"); });
    const { getByRole, getByText, queryByLabelText } = await render(
      <PublicPhotoDetailScreen
        currentUserId={currentUserId}
        loadComments={async () => [
          { id: 1, text: "내 댓글", date: "2026-08-24T11:00:00.000Z", author: { id: currentUserId, displayName: "나" } },
          { id: 2, text: "다른 댓글", date: "2026-08-24T11:01:00.000Z", author: { id: "22222222-2222-4222-8222-222222222222", displayName: "다른 사람" } }
        ]}
        loadPhoto={async () => photo}
        photoId="photo-a"
        removeComment={removeComment}
      />
    );

    await waitFor(() => expect(getByText("내 댓글")).toBeOnTheScreen());
    expect(queryByLabelText("댓글 2 삭제")).toBeNull();
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "댓글 1 삭제" }));
      await Promise.resolve();
    });
    await waitFor(() => expect(getByText("댓글을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.")).toBeOnTheScreen());
    expect(getByText("내 댓글")).toBeOnTheScreen();
  });

  it("offers retry on load failure and hides raw backend details", async () => {
    const { getByRole, getByText, queryByText } = await render(
      <PublicPhotoDetailScreen loadComments={async () => { throw new Error("secret row detail"); }} loadPhoto={async () => photo} photoId="photo-a" />
    );
    await waitFor(() => expect(getByText("댓글을 불러오지 못했어요")).toBeOnTheScreen());
    expect(getByRole("button", { name: "댓글 다시 시도" })).toBeOnTheScreen();
    expect(queryByText(/secret row detail/)).toBeNull();
    expect(getByText("로그인하면 댓글을 남길 수 있어요.")).toBeOnTheScreen();
  });
});
