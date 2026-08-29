import { createPhotoComment, deletePhotoComment, fetchPhotoComments } from "../src/photo-comment-repository";

describe("photo comment repository", () => {
  it("loads comments with safe profile display names", async () => {
    const fetchComments = jest.fn(async () => ({ rows: [
      { id: 1, text: "멋진 풍경이에요", date: "2026-08-24T10:00:00.000Z", author_id: "11111111-1111-4111-8111-111111111111" },
      { id: 2, text: "다시 가고 싶어요", date: "2026-08-24T11:00:00.000Z", author_id: "22222222-2222-4222-8222-222222222222" }
    ], error: null }));
    const fetchProfiles = jest.fn(async () => ({ rows: [
      { id: "11111111-1111-4111-8111-111111111111", nickname: "서울산책" }
    ], error: null }));

    await expect(fetchPhotoComments("photo-a", undefined, { fetchComments, fetchProfiles })).resolves.toEqual([
      { id: 1, text: "멋진 풍경이에요", date: "2026-08-24T10:00:00.000Z", author: { id: "11111111-1111-4111-8111-111111111111", displayName: "서울산책" } },
      { id: 2, text: "다시 가고 싶어요", date: "2026-08-24T11:00:00.000Z", author: { id: "22222222-2222-4222-8222-222222222222", displayName: "Ikkyee 여행자" } }
    ]);
  });

  it("trims new comments and returns only a generic error", async () => {
    const insertComment = jest.fn(async () => ({ row: {
      id: 3, text: "좋아요", date: "2026-08-24T12:00:00.000Z", author_id: "11111111-1111-4111-8111-111111111111"
    }, error: null }));
    const fetchProfile = jest.fn(async () => ({ row: { nickname: "서울산책" }, error: null }));

    await expect(createPhotoComment("photo-a", "11111111-1111-4111-8111-111111111111", "  좋아요  ", { insertComment, fetchProfile })).resolves.toMatchObject({ text: "좋아요" });
    expect(insertComment).toHaveBeenCalledWith("photo-a", "11111111-1111-4111-8111-111111111111", "좋아요");
    await expect(createPhotoComment("photo-a", "11111111-1111-4111-8111-111111111111", " ", { insertComment, fetchProfile })).rejects.toThrow("댓글을 작성하지 못했습니다.");
    await expect(createPhotoComment("photo-a", "11111111-1111-4111-8111-111111111111", "안녕", {
      insertComment: async () => ({ row: null, error: new Error("secret database detail") }), fetchProfile
    })).rejects.toThrow("댓글을 작성하지 못했습니다.");
  });

  it("deletes only a valid comment id through the policy-backed mutation", async () => {
    const removeComment = jest.fn(async () => ({ deleted: true, error: null }));
    await expect(deletePhotoComment(7, removeComment)).resolves.toBeUndefined();
    expect(removeComment).toHaveBeenCalledWith(7);
    await expect(deletePhotoComment(0, removeComment)).rejects.toThrow("댓글을 삭제하지 못했습니다.");
  });
});
