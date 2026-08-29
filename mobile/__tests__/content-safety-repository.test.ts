import { blockUser, fetchBlockedUsers, reportPublicPhoto, unblockUser } from "../src/content-safety-repository";

const viewerId = "11111111-1111-4111-8111-111111111111";
const authorId = "22222222-2222-4222-8222-222222222222";

describe("content safety repository", () => {
  it("submits a normalized report without exposing backend errors", async () => {
    const insertReport = jest.fn(async () => ({ inserted: true, error: null }));
    await expect(reportPublicPhoto("photo-a", viewerId, authorId, "harassment", "  반복적인 모욕  ", insertReport)).resolves.toBeUndefined();
    expect(insertReport).toHaveBeenCalledWith({ photoId: "photo-a", reporterId: viewerId, reportedUserId: authorId, reason: "harassment", details: "반복적인 모욕" });
    await expect(reportPublicPhoto("photo-a", viewerId, authorId, "invalid" as never, "", insertReport)).rejects.toThrow("신고를 접수하지 못했습니다.");
    await expect(reportPublicPhoto("photo-a", viewerId, authorId, "spam", "", async () => ({ inserted: false, error: new Error("secret") }))).rejects.toThrow("신고를 접수하지 못했습니다.");
  });

  it("blocks and unblocks a different valid user", async () => {
    const insertBlock = jest.fn(async () => ({ inserted: true, error: null }));
    const deleteBlock = jest.fn(async () => ({ deleted: true, error: null }));
    await expect(blockUser(viewerId, authorId, insertBlock)).resolves.toBeUndefined();
    expect(insertBlock).toHaveBeenCalledWith(viewerId, authorId);
    await expect(unblockUser(authorId, deleteBlock)).resolves.toBeUndefined();
    await expect(blockUser(viewerId, viewerId, insertBlock)).rejects.toThrow("사용자를 차단하지 못했습니다.");
  });

  it("loads only valid block snapshots", async () => {
    const fetchRows = jest.fn(async () => ({ rows: [
      { blocked_id: authorId, blocked_display_name: "여행작가", created_at: "2026-08-24T12:00:00.000Z" },
      { blocked_id: "bad", blocked_display_name: "bad", created_at: "bad" }
    ], error: null }));
    await expect(fetchBlockedUsers(undefined, fetchRows)).resolves.toEqual([
      { blockedUserId: authorId, displayName: "여행작가", createdAt: "2026-08-24T12:00:00.000Z" }
    ]);
  });
});
