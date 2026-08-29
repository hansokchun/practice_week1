export const publicationIntents = ["private", "link", "public"] as const;
export type PublicationIntent = (typeof publicationIntents)[number];

export type PublicationSelection = {
  readonly intent: PublicationIntent;
  readonly assetIds: readonly string[];
};

export type PublicationReviewParams = {
  readonly intent: string;
  readonly assetIds: string;
};

const MAX_SELECTED_PHOTOS = 20;
const MAX_ASSET_ID_LENGTH = 512;

function isValidAssetId(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && value.length <= MAX_ASSET_ID_LENGTH;
}

function isPublicationIntent(value: unknown): value is PublicationIntent {
  return typeof value === "string" && publicationIntents.includes(value as PublicationIntent);
}

function isValidAssetSelection(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= MAX_SELECTED_PHOTOS &&
    value.every(isValidAssetId) && new Set(value).size === value.length;
}

export function togglePublicationPhoto(
  selectedAssetIds: readonly string[],
  assetId: string
): readonly string[] {
  if (!isValidAssetId(assetId)) throw new Error("A valid device asset id is required");
  if (selectedAssetIds.includes(assetId)) {
    return selectedAssetIds.filter((selectedId) => selectedId !== assetId);
  }
  if (selectedAssetIds.length >= MAX_SELECTED_PHOTOS) {
    throw new Error("Up to 20 photos can be selected");
  }
  return [...selectedAssetIds, assetId];
}

export function createPublicationReviewParams(
  intent: PublicationIntent,
  assetIds: readonly string[]
): PublicationReviewParams {
  if (!isValidAssetSelection(assetIds)) throw new Error("A valid photo selection is required");
  return { intent, assetIds: JSON.stringify(assetIds) };
}

export function parsePublicationReviewParams(input: {
  readonly intent?: string | string[];
  readonly assetIds?: string | string[];
}): PublicationSelection | null {
  const intent = Array.isArray(input.intent) ? input.intent[0] : input.intent;
  const serializedAssetIds = Array.isArray(input.assetIds) ? input.assetIds[0] : input.assetIds;
  if (!isPublicationIntent(intent) || typeof serializedAssetIds !== "string") return null;
  try {
    const assetIds: unknown = JSON.parse(serializedAssetIds);
    return isValidAssetSelection(assetIds) ? { intent, assetIds } : null;
  } catch (cause) {
    void cause;
    return null;
  }
}
