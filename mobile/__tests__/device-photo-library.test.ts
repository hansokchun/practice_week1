import {
  loadAuthorizedPhotoPreview,
  resolvePhotoLibraryPermission
} from "../src/device-photo-library";

describe("device photo library", () => {
  it.each([
    ["none", { granted: true, accessPrivileges: "all", canAskAgain: true }, "full", "enumerate-all"],
    ["none", { granted: true, accessPrivileges: "limited", canAskAgain: true }, "limited", "enumerate-limited"],
    ["none", { granted: false, accessPrivileges: "none", canAskAgain: true }, "denied", "request-access"],
    ["limited", { granted: false, accessPrivileges: "none", canAskAgain: false }, "revoked", "stop-and-reconcile"]
  ] as const)("maps %s access safely", (previous, response, state, nextAction) => {
    expect(resolvePhotoLibraryPermission(previous, response)).toMatchObject({
      state,
      nextAction,
      canAskAgain: response.canAskAgain
    });
  });

  it("loads a bounded photo-only preview after authorization", async () => {
    const listPhotos = jest.fn(async () => [{
      id: "asset-1",
      filename: "seoul.jpg",
      width: 1200,
      height: 1500,
      creationTime: 1_700_000_000_000
    }]);

    await expect(loadAuthorizedPhotoPreview({ listPhotos }, "full")).resolves.toEqual([
      expect.objectContaining({ id: "asset-1", filename: "seoul.jpg" })
    ]);
    expect(listPhotos).toHaveBeenCalledWith(60);
  });

  it("never reads assets while permission is denied or revoked", async () => {
    const listPhotos = jest.fn();

    await expect(loadAuthorizedPhotoPreview({ listPhotos }, "denied")).resolves.toEqual([]);
    await expect(loadAuthorizedPhotoPreview({ listPhotos }, "revoked")).resolves.toEqual([]);
    expect(listPhotos).not.toHaveBeenCalled();
  });
});
