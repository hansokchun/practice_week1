import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ProfileEditor } from "../src/ProfileEditor";

const profile = { nickname: "여행자", bio: "걷다가 만난 풍경", avatarPath: null, avatarUrl: null };
const loadProfile = async () => profile;

describe("profile presentation and editing", () => {
  it("starts with identity, and cancels draft changes without saving", async () => {
    const saveProfile = jest.fn();
    const screen = await render(<ProfileEditor userId="viewer" loadProfile={loadProfile} saveProfile={saveProfile} />);
    await waitFor(() => expect(screen.getByText(profile.bio)).toBeOnTheScreen());
    expect(screen.queryByLabelText("프로필 이름")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "프로필 수정" }));
    await fireEvent.changeText(screen.getByLabelText("프로필 이름"), "새 이름");
    await fireEvent.press(screen.getByRole("button", { name: "프로필 수정 취소" }));
    expect(screen.getByText(profile.nickname)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "프로필 수정" }));
    expect(screen.getByLabelText("프로필 이름")).toHaveDisplayValue(profile.nickname);
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("returns to updated identity only after saving succeeds", async () => {
    const saveProfile = jest.fn().mockRejectedValueOnce(new Error("unavailable"))
      .mockResolvedValueOnce({ ...profile, nickname: "새 이름", cleanupPending: false });
    const screen = await render(<ProfileEditor userId="viewer" loadProfile={loadProfile} saveProfile={saveProfile} />);
    await waitFor(() => expect(screen.getByText(profile.nickname)).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole("button", { name: "프로필 수정" }));
    await fireEvent.changeText(screen.getByLabelText("프로필 이름"), "새 이름");
    await fireEvent.press(screen.getByRole("button", { name: "프로필 저장" }));
    await waitFor(() => expect(screen.getByText(/프로필을 저장하지 못했어요/)).toBeOnTheScreen());
    expect(screen.getByLabelText("프로필 이름")).toHaveDisplayValue("새 이름");
    await fireEvent.press(screen.getByRole("button", { name: "프로필 저장" }));
    await waitFor(() => expect(screen.getByText("프로필을 저장했습니다.")).toBeOnTheScreen());
    expect(screen.queryByLabelText("프로필 이름")).toBeNull();
    expect(screen.getByText("새 이름")).toBeOnTheScreen();
  });
});
