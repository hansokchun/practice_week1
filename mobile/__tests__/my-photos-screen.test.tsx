import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { MyPhotosScreen } from "../app/(tabs)/my-photos";
import type { DevicePhotoLibraryAdapter, PhotoLibraryPermissionResponse } from "../src/device-photo-library";

function createAdapter(overrides: Partial<DevicePhotoLibraryAdapter> = {}): DevicePhotoLibraryAdapter {
  return {
    getPermission: jest.fn(async (): Promise<PhotoLibraryPermissionResponse> => ({ granted: false, accessPrivileges: "none", canAskAgain: true })),
    requestPermission: jest.fn(async (): Promise<PhotoLibraryPermissionResponse> => ({ granted: true, accessPrivileges: "all", canAskAgain: true })),
    manageLimitedAccess: jest.fn(async () => undefined),
    listPhotos: jest.fn(async () => []),
    ...overrides
  };
}

describe("My Photos permission flow", () => {
  it("persists authorized device photo metadata through the local indexing runtime", async () => {
    const adapter = createAdapter({
      getPermission: jest.fn(async (): Promise<PhotoLibraryPermissionResponse> => ({
        granted: true,
        accessPrivileges: "all",
        canAskAgain: true
      })),
      listPhotos: jest.fn(async () => [{
        id: "asset-1",
        filename: "jeju.jpg",
        width: 1200,
        height: 1500,
        creationTime: 1_700_000_000_000
      }])
    });
    const refreshLocalPhotos = jest.fn(async () => ({
      scan: {
        status: "completed" as const,
        processedAssetCount: 1,
        removedAssetCount: 0,
        restartedForDrift: false
      },
      photos: [{
        id: "asset-db",
        filename: null,
        width: 900,
        height: 1200,
        creationTime: 1_800_000_000_000,
        modificationTime: 1_800_000_000_100,
        latitude: null,
        longitude: null
      }],
      mapPhotos: [{
        id: "asset-map",
        filename: null,
        width: 900,
        height: 1200,
        creationTime: 1_700_000_000_000,
        modificationTime: 1_700_000_000_100,
        latitude: 37.5665,
        longitude: 126.978
      }]
    }));
    const loadThumbnail = jest.fn(async (assetId: string) => `file:///cache/${assetId}.jpg`);
    const openPhoto = jest.fn();
    const openAlbums = jest.fn();
    const startPublicationReview = jest.fn();
    const { getByLabelText, getByRole, getByText, queryByText } = await render(
      <MyPhotosScreen
        adapter={adapter}
        refreshLocalPhotos={refreshLocalPhotos}
        loadThumbnail={loadThumbnail}
        openPhoto={openPhoto}
        openAlbums={openAlbums}
        startPublicationReview={startPublicationReview}
      />
    );

    await waitFor(() => expect(getByText("기기 사진 1장 정리 완료")).toBeOnTheScreen());
    expect(refreshLocalPhotos).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getByLabelText("기기 사진").props["source"]).toEqual({
      uri: "file:///cache/asset-db.jpg"
    }));
    expect(queryByText("jeju.jpg")).not.toBeOnTheScreen();
    expect(getByText("위치 없음")).toBeOnTheScreen();
    await act(async () => fireEvent.press(getByRole("button", { name: "앨범 보기" })));
    expect(openAlbums).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "사진 상세 열기 기기 사진" }));
    });
    expect(openPhoto).toHaveBeenLastCalledWith("asset-db");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "지도 보기" }));
    });
    await waitFor(() => expect(getByText("위치가 있는 사진 1장")).toBeOnTheScreen());
    expect(getByLabelText("기기 사진 위치 1")).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(getByLabelText("기기 사진 위치 1"));
    });
    expect(openPhoto).toHaveBeenLastCalledWith("asset-map");
    expect(queryByText("33.4996")).not.toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "사진 보기" }));
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "사진 선택" }));
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "게시용 사진 선택 기기 사진" }));
    });
    expect(getByText("1장 선택")).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "공개 게시" }));
    });
    expect(startPublicationReview).toHaveBeenCalledWith({
      intent: "public",
      assetIds: ["asset-db"]
    });
  });

  it("requests access and renders authorized device photos", async () => {
    const adapter = createAdapter({
      listPhotos: jest.fn(async () => [{
        id: "asset-1",
        filename: "busan.jpg",
        width: 1200,
        height: 1500,
        creationTime: 1_700_000_000_000
      }])
    });
    const { getByRole, getByText } = await render(<MyPhotosScreen adapter={adapter} />);

    await waitFor(() => expect(getByRole("button", { name: "사진 접근 허용" })).toBeOnTheScreen());
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "사진 접근 허용" }));
    });

    await waitFor(() => expect(getByText("busan.jpg")).toBeOnTheScreen());
    expect(adapter.requestPermission).toHaveBeenCalledTimes(1);
    expect(adapter.listPhotos).toHaveBeenCalledWith(60);
  });

  it("offers limited-library management without claiming full access", async () => {
    const adapter = createAdapter({
      getPermission: jest.fn(async (): Promise<PhotoLibraryPermissionResponse> => ({ granted: true, accessPrivileges: "limited", canAskAgain: true }))
    });
    const { getByRole, getByText } = await render(<MyPhotosScreen adapter={adapter} />);

    await waitFor(() => expect(getByText("선택한 사진만 표시하고 있어요")).toBeOnTheScreen());
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "접근 사진 관리" }));
    });

    await waitFor(() => expect(adapter.manageLimitedAccess).toHaveBeenCalledTimes(1));
  });

  it("opens system settings when access can no longer be requested", async () => {
    const adapter = createAdapter({
      getPermission: jest.fn(async (): Promise<PhotoLibraryPermissionResponse> => ({ granted: false, accessPrivileges: "none", canAskAgain: false }))
    });
    const openSettings = jest.fn(async () => undefined);
    const clearPublicationDerivatives = jest.fn(async () => undefined);
    const clearThumbnailCache = jest.fn(async () => undefined);
    const { getByRole } = await render(
      <MyPhotosScreen
        adapter={adapter}
        clearPublicationDerivatives={clearPublicationDerivatives}
        clearThumbnailCache={clearThumbnailCache}
        openSettings={openSettings}
      />
    );

    await waitFor(() => expect(getByRole("button", { name: "설정 열기" })).toBeOnTheScreen());
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "설정 열기" }));
    });

    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(clearThumbnailCache).toHaveBeenCalledTimes(1);
    expect(clearPublicationDerivatives).toHaveBeenCalledTimes(1);
    expect(adapter.listPhotos).not.toHaveBeenCalled();
  });

  it("rebuilds only the failed local thumbnail without refreshing the library", async () => {
    const adapter = createAdapter({
      getPermission: jest.fn(async (): Promise<PhotoLibraryPermissionResponse> => ({ granted: true, accessPrivileges: "all", canAskAgain: true })),
      listPhotos: jest.fn(async () => [{ id: "asset-a", filename: "broken.jpg", width: 1200, height: 900, creationTime: 1 }])
    });
    const refreshLocalPhotos = jest.fn(async () => ({
      scan: { status: "completed" as const, processedAssetCount: 1, removedAssetCount: 0, restartedForDrift: false },
      photos: [{ id: "asset-a", filename: null, width: 1200, height: 900, creationTime: 1, modificationTime: 1, latitude: null, longitude: null }],
      mapPhotos: []
    }));
    const recoverThumbnail = jest.fn(async () => "file:///cache/rebuilt.jpg");
    const openPhoto = jest.fn();
    const screen = await render(
      <MyPhotosScreen
        adapter={adapter}
        loadThumbnail={async () => "file:///cache/broken.jpg"}
        openPhoto={openPhoto}
        recoverThumbnail={recoverThumbnail}
        refreshLocalPhotos={refreshLocalPhotos}
      />
    );
    await waitFor(() => expect(screen.getByLabelText("기기 사진")).toBeOnTheScreen());

    fireEvent(screen.getByLabelText("기기 사진"), "error");
    await waitFor(() => expect(screen.getByRole("button", { name: "기기 사진 썸네일 다시 만들기" })).toBeOnTheScreen());
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "기기 사진 썸네일 다시 만들기" })));

    await waitFor(() => expect(recoverThumbnail).toHaveBeenCalledWith("asset-a"));
    expect(refreshLocalPhotos).toHaveBeenCalledTimes(1);
    expect(openPhoto).not.toHaveBeenCalled();
  });
});
