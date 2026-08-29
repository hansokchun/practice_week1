import { render } from "@testing-library/react-native";

import { LikesScreen } from "../app/(tabs)/likes";
import { MyPhotosScreen } from "../app/(tabs)/my-photos";

describe("primary tab screens", () => {
  it("shows an actionable empty state for personal photos", async () => {
    const adapter = {
      getPermission: jest.fn(async () => ({ granted: false, accessPrivileges: "none" as const, canAskAgain: true })),
      requestPermission: jest.fn(async () => ({ granted: true, accessPrivileges: "all" as const, canAskAgain: true })),
      manageLimitedAccess: jest.fn(async () => undefined),
      listPhotos: jest.fn(async () => [])
    };
    const { getByRole, getByText } = await render(<MyPhotosScreen adapter={adapter} />);

    await expect(getByText("기기 사진을 가져오세요")).toBeOnTheScreen();
    expect(getByRole("button", { name: "사진 접근 허용" })).toBeOnTheScreen();
  });

  it("shows the signed-out state for likes without claiming saved data", async () => {
    const { getByRole, getByText } = await render(<LikesScreen />);

    expect(getByText("로그인하면 좋아요 한 사진을 모아볼 수 있어요")).toBeOnTheScreen();
    expect(getByRole("button", { name: "로그인하기" })).toBeOnTheScreen();
  });
});
