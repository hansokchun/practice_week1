import nativeMediaCapabilities from "./native-media-capabilities.json";

export type ExpoMediaAccess = "all" | "limited" | "none";
export type PermissionState = "full" | "limited" | "denied" | "revoked";
export type PermissionNextAction =
  | "enumerate-all"
  | "enumerate-limited"
  | "request-access"
  | "stop-and-reconcile";

export type PermissionTransition = {
  readonly state: PermissionState;
  readonly nextAction: PermissionNextAction;
  readonly requiresReconciliation: boolean;
};

export type AssetCheckpoint = {
  readonly offset: number;
  readonly lastAssetId: string | null;
  readonly processedAssetCount: number;
};

export type AssetEnumerationRequest = {
  readonly assetIds: readonly string[];
  readonly checkpoint?: AssetCheckpoint;
  readonly maximumAssets?: number;
};

export type AssetEnumerationResult = {
  readonly pages: readonly (readonly string[])[];
  readonly checkpoint: AssetCheckpoint;
  readonly reconciliationRequired: boolean;
};

export type MediaDecisionInput = {
  readonly platform: "ios" | "android";
  readonly format: "jpeg" | "heic";
  readonly cloudOnly: boolean;
  readonly livePhoto: boolean;
  readonly exifPresent: boolean;
  readonly gpsPresent: boolean;
  readonly accessMediaLocation: boolean;
};

export type MediaDecision = {
  readonly metadata: {
    readonly exif: "available" | "unavailable" | "requires-access-media-location";
    readonly gps: "available" | "unavailable" | "requires-access-media-location";
  };
  readonly original: "available" | "unresolved-heic" | "unresolved-icloud-original";
  readonly resources: {
    readonly representative: "expo-asset";
    readonly pairedVideo: "expo-temporary-video" | "not-applicable";
    readonly completeResources: "native-phasset-resource-manager" | "not-applicable";
  };
};

export type LibraryChangeInput = {
  readonly platform: "ios" | "android";
  readonly event: "foreground-change" | "resume-after-termination";
  readonly hasIncrementalDetails: boolean;
};

export type AndroidChangeTokenInput = {
  readonly volume: string | null;
  readonly version: string | null;
  readonly generation: number | null;
};

export type AndroidChangeToken =
  | { readonly kind: "native-required"; readonly missing: readonly string[] }
  | { readonly kind: "available"; readonly checkpoint: string };

class UnsupportedCapabilityVariantError extends Error {
  override readonly name = "UnsupportedCapabilityVariantError";

  constructor(readonly value: never) {
    super("Unsupported native media capability variant");
  }
}

const assertNever = (value: never): never => {
  throw new UnsupportedCapabilityVariantError(value);
};

export function resolvePermissionTransition(
  previous: ExpoMediaAccess,
  current: ExpoMediaAccess
): PermissionTransition {
  switch (current) {
    case "all":
      return { state: "full", nextAction: "enumerate-all", requiresReconciliation: false };
    case "limited":
      return {
        state: "limited",
        nextAction: "enumerate-limited",
        requiresReconciliation: true
      };
    case "none":
      return previous === "none"
        ? { state: "denied", nextAction: "request-access", requiresReconciliation: false }
        : { state: "revoked", nextAction: "stop-and-reconcile", requiresReconciliation: true };
    default:
      return assertNever(current);
  }
}

export function enumerateAssetIds(request: AssetEnumerationRequest): AssetEnumerationResult {
  const policy = nativeMediaCapabilities.enumeration;
  const checkpoint = request.checkpoint ?? {
    offset: 0,
    lastAssetId: null,
    processedAssetCount: 0
  };
  const currentLastAssetId =
    checkpoint.offset === 0 ? null : (request.assetIds[checkpoint.offset - 1] ?? null);

  if (currentLastAssetId !== checkpoint.lastAssetId) {
    return { pages: [], checkpoint, reconciliationRequired: true };
  }

  const requestedMaximum = request.maximumAssets ?? policy.maximumAssetsPerRun;
  const maximumAssets = Math.min(requestedMaximum, policy.maximumAssetsPerRun);
  const endOffset = Math.min(checkpoint.offset + maximumAssets, request.assetIds.length);
  const selectedAssetIds = request.assetIds.slice(checkpoint.offset, endOffset);
  const pageCount = Math.ceil(selectedAssetIds.length / policy.pageSize);
  const pages = Array.from({ length: pageCount }, (_, pageIndex) => {
    const pageStart = pageIndex * policy.pageSize;
    return selectedAssetIds.slice(pageStart, pageStart + policy.pageSize);
  });

  return {
    pages,
    checkpoint: {
      offset: endOffset,
      lastAssetId: selectedAssetIds.at(-1) ?? checkpoint.lastAssetId,
      processedAssetCount: checkpoint.processedAssetCount + selectedAssetIds.length
    },
    reconciliationRequired: false
  };
}

export function resolveMediaDecision(input: MediaDecisionInput): MediaDecision {
  const locationPermissionMissing =
    input.platform === "android" && !input.accessMediaLocation;
  const metadata = {
    exif: input.exifPresent
      ? locationPermissionMissing
        ? "requires-access-media-location"
        : "available"
      : "unavailable",
    gps: input.gpsPresent
      ? locationPermissionMissing
        ? "requires-access-media-location"
        : "available"
      : "unavailable"
  } satisfies MediaDecision["metadata"];
  const original = input.cloudOnly
    ? "unresolved-icloud-original"
    : input.format === "heic"
      ? "unresolved-heic"
      : "available";
  const isIosLivePhoto = input.platform === "ios" && input.livePhoto;

  return {
    metadata,
    original,
    resources: {
      representative: "expo-asset",
      pairedVideo: isIosLivePhoto ? "expo-temporary-video" : "not-applicable",
      completeResources: isIosLivePhoto
        ? "native-phasset-resource-manager"
        : "not-applicable"
    }
  };
}

export function resolveLibraryChange(input: LibraryChangeInput):
  | "apply-incremental-change"
  | "reconcile-library" {
  switch (input.event) {
    case "foreground-change":
      return input.platform === "ios" && input.hasIncrementalDetails
        ? "apply-incremental-change"
        : "reconcile-library";
    case "resume-after-termination":
      return "reconcile-library";
    default:
      return assertNever(input.event);
  }
}

export function resolveAndroidChangeToken(input: AndroidChangeTokenInput): AndroidChangeToken {
  const missing = [
    input.volume === null ? "volume" : null,
    input.version === null ? "version" : null,
    input.generation === null ? "generation" : null
  ].filter((value): value is string => value !== null);

  if (input.volume === null || input.version === null || input.generation === null) {
    return { kind: "native-required", missing };
  }

  return {
    kind: "available",
    checkpoint: `${input.volume}:${input.version}:${input.generation}`
  };
}
