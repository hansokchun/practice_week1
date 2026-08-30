export const hiddenTabRoutes = [
  { name: "index", label: "Explore" },
  { name: "my-photos", label: "내 사진" },
  { name: "likes", label: "좋아요" }
] as const;

export const exploreRoute = "/explore" as const;
export const myPhotosRoute = "/my-photos" as const;
export const likesRoute = "/likes" as const;
export const uploadRoute = "/upload" as const;
export const profileRoute = "/profile" as const;
export const guestLoginRoute = "/auth/login" as const;
export const authCallbackRoute = "/auth/callback" as const;
export const passwordUpdateRoute = "/auth/update-password" as const;
export const devicePhotoDetailRoute = "/device-photo/[assetId]" as const;
export const devicePhotoLocationRoute = "/device-photo/[assetId]/location" as const;
export const publicationReviewRoute = "/publish/review" as const;
export const photoLinkRoute = "/photo-link/[token]" as const;
export const universalPhotoLinkRoute = "/photo-link" as const;
export const publicPhotoDetailRoute = "/explore-photo/[photoId]" as const;
export const publicProfileRoute = "/public-profile/[userId]" as const;
export const landingTagRoute = "/tag/[sectionId]" as const;
export const albumsRoute = "/albums" as const;
export const albumDetailRoute = "/album/[albumId]" as const;

export function buildLandingTagRoute(sectionId: string): string {
  return `/tag/${encodeURIComponent(sectionId.trim())}`;
}
