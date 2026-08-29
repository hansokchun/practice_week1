import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { DevicePhotoDetailScreen } from "../app/device-photo/[assetId]";

describe("device photo detail screen", () => {
  it("separates device-original metadata from cloud publication state", async () => {
    const loadPhoto = jest.fn(async () => ({
      id: "asset-detail",
      mediaType: "live_photo" as const,
      width: 4032,
      height: 3024,
      capturedAt: Date.UTC(2024, 2, 5, 14, 6),
      modifiedAt: Date.UTC(2024, 2, 5, 14, 7),
      hasPrivateLocation: true,
      publicationState: "not-published" as const
    }));
    const loadThumbnail = jest.fn(async () => "file:///cache/detail.jpg");
    const editLocation = jest.fn();
    const { getByLabelText, getByRole, getByText, queryByText } = await render(
      <DevicePhotoDetailScreen
        assetId="asset-detail"
        goBack={jest.fn()}
        loadPhoto={loadPhoto}
        loadThumbnail={loadThumbnail}
        editLocation={editLocation}
      />
    );

    await waitFor(() => expect(getByText("기기 원본 사용 가능")).toBeOnTheScreen());
    expect(getByText("클라우드에 게시하지 않음")).toBeOnTheScreen();
    expect(getByText("Live Photo")).toBeOnTheScreen();
    expect(getByText("4032 × 3024")).toBeOnTheScreen();
    expect(getByText("비공개 위치 있음")).toBeOnTheScreen();
    expect(getByLabelText("기기 사진 미리보기").props["source"]).toEqual({ uri: "file:///cache/detail.jpg" });
    expect(queryByText(/33\.4996|126\.5312/)).not.toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "위치 수정" }));
    });
    expect(editLocation).toHaveBeenCalledWith("asset-detail");
  });

  it("shows a recoverable state when the indexed asset no longer exists", async () => {
    const { getByText } = await render(
      <DevicePhotoDetailScreen
        assetId="missing"
        goBack={jest.fn()}
        loadPhoto={async () => null}
        loadThumbnail={async () => "unused"}
      />
    );

    await waitFor(() => expect(getByText("기기에서 사진을 찾지 못했어요")).toBeOnTheScreen());
  });

  it("requires an explicit press to retry a failed publication", async () => {
    const retryPublication = jest.fn(async () => ({ succeeded: 1, failed: 0, jobIds: ["job-a"] }));
    const { getByRole, getByText } = await render(
      <DevicePhotoDetailScreen
        assetId="asset-failed"
        goBack={jest.fn()}
        loadPhoto={async () => ({
          id: "asset-failed",
          mediaType: "photo" as const,
          width: 1200,
          height: 900,
          capturedAt: null,
          modifiedAt: null,
          hasPrivateLocation: false,
          publicationState: "failed" as const
        })}
        loadThumbnail={async () => "file:///cache/failed.jpg"}
        retryPublication={retryPublication}
      />
    );

    await waitFor(() => expect(getByRole("button", { name: "게시 다시 시도" })).toBeOnTheScreen());
    expect(retryPublication).not.toHaveBeenCalled();
    await act(async () => fireEvent.press(getByRole("button", { name: "게시 다시 시도" })));
    await waitFor(() => expect(getByText("클라우드 게시 완료")).toBeOnTheScreen());
    expect(retryPublication).toHaveBeenCalledWith("asset-failed");
  });

  it("requires explicit confirmation before deleting a cloud publication while preserving the device original", async () => {
    const deletePublication = jest.fn(async () => ({ photoId: "photo-a" }));
    const { getByRole, getByText, queryByText } = await render(
      <DevicePhotoDetailScreen
        assetId="asset-published"
        goBack={jest.fn()}
        loadPhoto={async () => ({
          id: "asset-published",
          mediaType: "photo" as const,
          width: 1200,
          height: 900,
          capturedAt: null,
          modifiedAt: null,
          hasPrivateLocation: false,
          publicationState: "published" as const
        })}
        loadThumbnail={async () => "file:///cache/original-preview.jpg"}
        deletePublication={deletePublication}
      />
    );

    await waitFor(() => expect(getByRole("button", { name: "클라우드 게시 사진 삭제" })).toBeOnTheScreen());
    expect(deletePublication).not.toHaveBeenCalled();
    await act(async () => fireEvent.press(getByRole("button", { name: "클라우드 게시 사진 삭제" })));
    expect(getByText("기기 원본은 삭제되지 않습니다.")).toBeOnTheScreen();
    expect(deletePublication).not.toHaveBeenCalled();
    await act(async () => fireEvent.press(getByRole("button", { name: "클라우드 게시 사진 삭제 확인" })));

    await waitFor(() => expect(getByText("클라우드에 게시하지 않음")).toBeOnTheScreen());
    expect(deletePublication).toHaveBeenCalledWith("asset-published");
    expect(queryByText("기기 원본 사용 가능")).toBeOnTheScreen();
  });

  it("rebuilds a failed detail thumbnail without changing the device photo metadata", async () => {
    const recoverThumbnail = jest.fn(async () => "file:///cache/detail-rebuilt.jpg");
    const screen = await render(
      <DevicePhotoDetailScreen
        assetId="asset-detail"
        goBack={jest.fn()}
        loadPhoto={async () => ({
          id: "asset-detail", mediaType: "photo" as const, width: 1200, height: 900,
          capturedAt: null, modifiedAt: null, hasPrivateLocation: false, publicationState: "not-published" as const
        })}
        loadThumbnail={async () => "file:///cache/detail-broken.jpg"}
        recoverThumbnail={recoverThumbnail}
      />
    );
    await waitFor(() => expect(screen.getByLabelText("기기 사진 미리보기")).toBeOnTheScreen());

    fireEvent(screen.getByLabelText("기기 사진 미리보기"), "error");
    await waitFor(() => expect(screen.getByRole("button", { name: "기기 사진 미리보기 썸네일 다시 만들기" })).toBeOnTheScreen());
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "기기 사진 미리보기 썸네일 다시 만들기" })));

    await waitFor(() => expect(recoverThumbnail).toHaveBeenCalledWith("asset-detail"));
    expect(screen.getByText("기기 원본 사용 가능")).toBeOnTheScreen();
  });
});
