import {
  authCallbackRoute,
  devicePhotoDetailRoute,
  devicePhotoLocationRoute,
  guestLoginRoute,
  passwordUpdateRoute,
  photoLinkRoute,
  publicPhotoDetailRoute,
  publicProfileRoute,
  publicationReviewRoute,
  hiddenTabRoutes,
  profileRoute,
  exploreRoute,
  likesRoute,
  myPhotosRoute,
  uploadRoute,
  universalPhotoLinkRoute
} from "../src/mobile-routes";

describe("mobile route contract", () => {
  it("keeps library screens registered internally without exposing fixed bottom navigation", () => {
    expect(hiddenTabRoutes).toEqual([
      { name: "index", label: "Explore" },
      { name: "my-photos", label: "내 사진" },
      { name: "likes", label: "좋아요" }
    ]);
  });

  it("keeps guest account entry routes explicit", () => {
    expect(exploreRoute).toBe("/explore");
    expect(myPhotosRoute).toBe("/my-photos");
    expect(likesRoute).toBe("/likes");
    expect(uploadRoute).toBe("/upload");
    expect(profileRoute).toBe("/profile");
    expect(guestLoginRoute).toBe("/auth/login");
    expect(authCallbackRoute).toBe("/auth/callback");
    expect(passwordUpdateRoute).toBe("/auth/update-password");
    expect(devicePhotoDetailRoute).toBe("/device-photo/[assetId]");
    expect(devicePhotoLocationRoute).toBe("/device-photo/[assetId]/location");
    expect(publicationReviewRoute).toBe("/publish/review");
    expect(photoLinkRoute).toBe("/photo-link/[token]");
    expect(universalPhotoLinkRoute).toBe("/photo-link");
    expect(publicPhotoDetailRoute).toBe("/explore-photo/[photoId]");
    expect(publicProfileRoute).toBe("/public-profile/[userId]");
  });
});
