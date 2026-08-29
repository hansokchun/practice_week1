import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { RecoverableDeviceThumbnail } from "../src/RecoverableDeviceThumbnail";
import { regenerateDevicePhotoThumbnail } from "../src/device-photo-thumbnail-recovery";

describe("device photo thumbnail recovery", () => {
  it("removes a broken cache entry before rendering a replacement", async () => {
    const calls: string[] = [];
    const cache = {
      remove: jest.fn(async () => { calls.push("remove"); }),
      getOrCreate: jest.fn(async () => { calls.push("create"); return "file:///cache/rebuilt.jpg"; })
    };

    await expect(regenerateDevicePhotoThumbnail("asset-a", cache)).resolves.toBe("file:///cache/rebuilt.jpg");
    expect(calls).toEqual(["remove", "create"]);
    expect(cache.remove).toHaveBeenCalledWith("asset-a");
    expect(cache.getOrCreate).toHaveBeenCalledWith("asset-a");
  });

  it("shows a safe fallback and replaces a failed cached image", async () => {
    const recoverThumbnail = jest.fn(async () => "file:///cache/rebuilt.jpg");
    const screen = await render(
      <RecoverableDeviceThumbnail
        accessibilityLabel="기기 사진"
        assetId="asset-a"
        initialUri="file:///cache/broken.jpg"
        recoverThumbnail={recoverThumbnail}
      />
    );
    fireEvent(screen.getByLabelText("기기 사진"), "error");
    await waitFor(() => expect(screen.getByText("미리보기를 표시할 수 없어요")).toBeOnTheScreen());

    await act(async () => fireEvent.press(screen.getByRole("button", { name: "기기 사진 썸네일 다시 만들기" })));

    await waitFor(() => expect(screen.getByLabelText("기기 사진").props["source"]).toEqual({ uri: "file:///cache/rebuilt.jpg" }));
    expect(recoverThumbnail).toHaveBeenCalledWith("asset-a");
  });

  it("keeps the retry state safe when the original is no longer available", async () => {
    const screen = await render(
      <RecoverableDeviceThumbnail
        accessibilityLabel="기기 사진"
        assetId="missing"
        initialUri="file:///cache/broken.jpg"
        recoverThumbnail={async () => { throw new Error("private file detail"); }}
      />
    );
    fireEvent(screen.getByLabelText("기기 사진"), "error");
    await waitFor(() => expect(screen.getByRole("button", { name: "기기 사진 썸네일 다시 만들기" })).toBeOnTheScreen());
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "기기 사진 썸네일 다시 만들기" })));

    await waitFor(() => expect(screen.getByText("원본 접근을 확인하고 다시 시도해 주세요")).toBeOnTheScreen());
    expect(screen.queryByText(/private file detail/)).toBeNull();
  });
});
