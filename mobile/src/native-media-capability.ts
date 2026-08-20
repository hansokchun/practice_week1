import nativeMediaCapabilities from "./native-media-capabilities.json";

export {
  enumerateAssetIds,
  resolveAndroidChangeToken,
  resolveLibraryChange,
  resolveMediaDecision,
  resolvePermissionTransition
} from "./native-media-capability-behavior";
export type {
  AndroidChangeToken,
  AndroidChangeTokenInput,
  AssetCheckpoint,
  AssetEnumerationRequest,
  AssetEnumerationResult,
  ExpoMediaAccess,
  LibraryChangeInput,
  MediaDecision,
  MediaDecisionInput,
  PermissionNextAction,
  PermissionState,
  PermissionTransition
} from "./native-media-capability-behavior";

export type NativeMediaPlatform = "ios" | "android";

export type EnumerationCapability = {
  readonly maximumAssetsPerRun: number;
  readonly pageSize: number;
  readonly expoPagination: string;
  readonly offsetCanDrift: boolean;
  readonly resumeReconciliationRequired: boolean;
  readonly checkpoint: {
    readonly resumable: boolean;
    readonly fields: readonly string[];
  };
};

export type ChangeObservationCapability = {
  readonly foregroundListenerSupported: boolean;
  readonly terminatedProcessGuarantee: boolean;
  readonly resumeReconciliationRequired: boolean;
};

export type PermissionStateCapability = {
  readonly access: string;
  readonly canEnumerate: boolean;
  readonly requiresReconciliation: boolean;
};

export type IosMediaCapability = {
  readonly minimumOsVersion: string;
  readonly permissions: {
    readonly read: string;
    readonly write: string;
  };
  readonly expo: {
    readonly limitedAccess: boolean;
    readonly exif: boolean;
    readonly gps: boolean;
    readonly livePhotoDetection: boolean;
    readonly livePhotoPairedVideo: boolean;
    readonly foregroundChangeListener: boolean;
  };
  readonly livePhotos: {
    readonly detection: string;
    readonly pairedVideo: string;
    readonly completeResourceEnumeration: string;
  };
  readonly changeObservation: ChangeObservationCapability;
  readonly unresolvedDeviceProbes: readonly string[];
  readonly nativeGaps: {
    readonly completeLivePhotoResourceEnumeration: boolean;
    readonly requiredApi: string;
  };
};

export type AndroidMediaCapability = {
  readonly minimumApiLevel: number;
  readonly permissions: {
    readonly api24To32Read: string;
    readonly api33PlusImages: string;
    readonly api33PlusVideo: string;
    readonly originalLocation: string;
  };
  readonly expo: {
    readonly limitedAccess: boolean;
    readonly exif: boolean;
    readonly gps: boolean;
    readonly originalLocationRequiresAccessMediaLocation: boolean;
    readonly foregroundChangeListener: boolean;
    readonly incrementalChangeDetails: boolean;
  };
  readonly changeObservation: ChangeObservationCapability;
  readonly unresolvedDeviceProbes: readonly string[];
  readonly nativeGaps: {
    readonly mediaStoreSignals: readonly string[];
  };
};

export type NativeMediaCapability = {
  readonly schemaVersion: number;
  readonly expoSdk: number;
  readonly packageName: string;
  readonly packageVersion: string;
  readonly realDeviceVerified: boolean;
  readonly permissionStates: {
    readonly full: PermissionStateCapability;
    readonly limited: PermissionStateCapability;
    readonly denied: PermissionStateCapability;
    readonly revoked: PermissionStateCapability;
  };
  readonly enumeration: EnumerationCapability;
  readonly platforms: {
    readonly ios: IosMediaCapability;
    readonly android: AndroidMediaCapability;
  };
};

export const nativeMediaCapability: NativeMediaCapability = nativeMediaCapabilities;

export function getNativeMediaCapability(platform: "ios"): IosMediaCapability;
export function getNativeMediaCapability(platform: "android"): AndroidMediaCapability;
export function getNativeMediaCapability(
  platform: NativeMediaPlatform
): IosMediaCapability | AndroidMediaCapability {
  switch (platform) {
    case "ios":
      return nativeMediaCapability.platforms.ios;
    case "android":
      return nativeMediaCapability.platforms.android;
  }
}
