import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { BlockedUsersSection } from "../src/BlockedUsersSection";

const blockedId = "22222222-2222-4222-8222-222222222222";

describe("blocked users settings", () => {
  it("loads block snapshots and removes a user after explicit unblock", async () => {
    const unblock = jest.fn(async () => {});
    const { getByRole, getByText, queryByText } = await render(
      <BlockedUsersSection loadBlockedUsers={async () => [{ blockedUserId: blockedId, displayName: "여행작가", createdAt: "2026-08-24T12:00:00.000Z" }]} unblock={unblock} />
    );
    await waitFor(() => expect(getByText("여행작가")).toBeOnTheScreen());
    await act(async () => fireEvent.press(getByRole("button", { name: "여행작가 차단 해제" })));
    expect(unblock).toHaveBeenCalledWith(blockedId);
    expect(queryByText("여행작가")).toBeNull();
    expect(getByText("차단한 사용자가 없습니다.")).toBeOnTheScreen();
  });

  it("shows safe retry without backend details when loading fails", async () => {
    const loadBlockedUsers = jest.fn(async () => { throw new Error("secret database detail"); });
    const failed = await render(<BlockedUsersSection loadBlockedUsers={loadBlockedUsers} />);
    await waitFor(() => expect(failed.getByText("차단 목록을 불러오지 못했어요.")).toBeOnTheScreen());
    expect(failed.queryByText(/secret database detail/)).toBeNull();
    expect(failed.getByRole("button", { name: "차단 목록 다시 시도" })).toBeOnTheScreen();
  });

  it("restores a row when unblock fails", async () => {
    const restored = await render(
      <BlockedUsersSection loadBlockedUsers={async () => [{ blockedUserId: blockedId, displayName: "여행작가", createdAt: "2026-08-24T12:00:00.000Z" }]} unblock={async () => { throw new Error("secret"); }} />
    );
    await waitFor(() => expect(restored.getByText("여행작가")).toBeOnTheScreen());
    await act(async () => fireEvent.press(restored.getByRole("button", { name: "여행작가 차단 해제" })));
    await waitFor(() => expect(restored.getByText("차단을 해제하지 못했어요. 잠시 후 다시 시도해 주세요.")).toBeOnTheScreen());
    expect(restored.getByText("여행작가")).toBeOnTheScreen();
  });
});
