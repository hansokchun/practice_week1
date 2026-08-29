export const explorePhotoScopes = ["others", "mine"] as const;
export type ExplorePhotoScope = (typeof explorePhotoScopes)[number];

export type ExplorePhotoScopeOption = {
  readonly id: ExplorePhotoScope;
  readonly label: string;
};

function hasViewer(viewerId: string | null | undefined): viewerId is string {
  return typeof viewerId === "string" && viewerId.trim().length > 0;
}

export function normalizeExplorePhotoScope(value: unknown, viewerId: string | null | undefined): ExplorePhotoScope {
  return value === "mine" && hasViewer(viewerId) ? "mine" : "others";
}

export function getExplorePhotoScopeOptions(viewerId: string | null | undefined): readonly ExplorePhotoScopeOption[] {
  if (!hasViewer(viewerId)) return [{ id: "others", label: "공개 사진" }];
  return [
    { id: "others", label: "다른 사람 사진" },
    { id: "mine", label: "내 사진" }
  ];
}
