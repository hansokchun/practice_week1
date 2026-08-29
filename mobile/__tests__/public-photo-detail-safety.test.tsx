import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { PhotoSafetyControls } from "../src/PhotoSafetyControls";

const viewerId = "11111111-1111-4111-8111-111111111111";
const authorId = "22222222-2222-4222-8222-222222222222";
describe("public photo detail safety controls", () => {
  it("lets a signed-in non-owner submit a reasoned report", async () => {
    const reportPhoto = jest.fn(async () => {});
    const { getByLabelText, getByRole, getByText } = await render(
      <PhotoSafetyControls currentUserId={viewerId} onBlocked={jest.fn()} ownerId={authorId} photoId="photo-a" reportPhoto={reportPhoto} />
    );
    await waitFor(() => expect(getByRole("button", { name: "사진 신고" })).toBeOnTheScreen());
    await act(async () => fireEvent.press(getByRole("button", { name: "사진 신고" })));
    await waitFor(() => expect(getByRole("button", { name: "괴롭힘 또는 혐오" })).toBeOnTheScreen());
    await act(async () => fireEvent.press(getByRole("button", { name: "괴롭힘 또는 혐오" })));
    await act(async () => fireEvent.changeText(getByLabelText("신고 추가 설명"), "  반복적인 모욕  "));
    await waitFor(() => expect(getByLabelText("신고 추가 설명")).toHaveProp("value", "  반복적인 모욕  "));
    await waitFor(() => expect(getByRole("button", { name: "신고 접수" })).toBeEnabled());
    await act(async () => fireEvent.press(getByRole("button", { name: "신고 접수" })));
    expect(reportPhoto).toHaveBeenCalledWith("photo-a", viewerId, authorId, "harassment", "반복적인 모욕");
    await waitFor(() => expect(getByText("신고를 접수했습니다.")).toBeOnTheScreen());
  });

  it("requires confirmation before blocking and returns after success", async () => {
    const blockAuthor = jest.fn(async () => {});
    const goBack = jest.fn();
    const { getByRole, getByText } = await render(
      <PhotoSafetyControls blockAuthor={blockAuthor} currentUserId={viewerId} onBlocked={goBack} ownerId={authorId} photoId="photo-a" />
    );
    await waitFor(() => expect(getByRole("button", { name: "사용자 차단" })).toBeOnTheScreen());
    await act(async () => fireEvent.press(getByRole("button", { name: "사용자 차단" })));
    await waitFor(() => expect(getByText("이 사용자의 사진과 댓글이 더 이상 표시되지 않습니다.")).toBeOnTheScreen());
    await act(async () => fireEvent.press(getByRole("button", { name: "사용자 차단 확인" })));
    expect(blockAuthor).toHaveBeenCalledWith(viewerId, authorId);
    expect(goBack).toHaveBeenCalled();
  });

  it("does not expose report or block actions to guests or the photo owner", async () => {
    const guest = await render(<PhotoSafetyControls currentUserId={null} onBlocked={jest.fn()} ownerId={authorId} photoId="photo-a" />);
    expect(guest.queryByRole("button", { name: "사진 신고" })).toBeNull();
    await guest.unmount();
    const owner = await render(<PhotoSafetyControls currentUserId={authorId} onBlocked={jest.fn()} ownerId={authorId} photoId="photo-a" />);
    expect(owner.queryByRole("button", { name: "사용자 차단" })).toBeNull();
  });
});
