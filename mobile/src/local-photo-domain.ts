import localPhotoDomainJson from "./local-photo-domain.json";

export const localPhotoSources = ["device", "cloud"] as const;
export const localPhotoAvailability = [
  "available",
  "missing",
  "restricted"
] as const;
export const cloudPublicationVisibility = ["private", "link", "public"] as const;

export type LocalPhotoSource = (typeof localPhotoSources)[number];
export type LocalPhotoAvailability = (typeof localPhotoAvailability)[number];
export type CloudPublicationVisibility =
  (typeof cloudPublicationVisibility)[number];

export type LocalPhotoDomainContract = {
  readonly schemaVersion: number;
  readonly sources: readonly LocalPhotoSource[];
  readonly availability: readonly LocalPhotoAvailability[];
  readonly cloudPublicationVisibility: readonly CloudPublicationVisibility[];
  readonly fingerprint: {
    readonly algorithm: "sha-256";
    readonly format: "normalized-lowercase-hex";
    readonly length: 64;
    readonly opaque: true;
  };
  readonly device: {
    readonly localOnly: true;
    readonly accountIndependent: true;
  };
  readonly privacy: {
    readonly exactLocationLogging: false;
    readonly exactLocationSerialization: false;
  };
};

export type AssetFingerprint = { readonly algorithm: "sha-256"; readonly value: string };

export type AssetFingerprintParseResult =
  | { readonly kind: "valid"; readonly fingerprint: AssetFingerprint }
  | { readonly kind: "invalid"; readonly reason: "normalized-sha256-required" };

export type PrivateLocalLocation = { readonly latitude: number; readonly longitude: number };

export type DevicePhotoInput = { readonly fingerprint: AssetFingerprint; readonly availability: LocalPhotoAvailability; readonly privateLocation: PrivateLocalLocation | null };

export type CloudPhotoInput = { readonly fingerprint: AssetFingerprint; readonly availability: LocalPhotoAvailability; readonly visibility: CloudPublicationVisibility };

export type DeviceLocalPhoto = {
  readonly source: "device";
  readonly localOnly: true;
  readonly fingerprint: AssetFingerprint;
  readonly availability: LocalPhotoAvailability;
  readonly privateLocation: PrivateLocalLocation | null;
};

export type CloudLocalPhoto = {
  readonly source: "cloud";
  readonly localOnly: false;
  readonly fingerprint: AssetFingerprint;
  readonly availability: LocalPhotoAvailability;
  readonly visibility: CloudPublicationVisibility;
};

export type LocalPhoto = DeviceLocalPhoto | CloudLocalPhoto;

export type LocalPhotoPublication =
  | { readonly localOnly: true; readonly visibility: null }
  | { readonly localOnly: false; readonly visibility: CloudPublicationVisibility };

export type LocalPhotoDebugSummary = {
  readonly source: LocalPhotoSource;
  readonly availability: LocalPhotoAvailability;
  readonly localOnly: boolean;
  readonly hasPrivateLocation: boolean;
};

export type SerializedLocalPhoto =
  | {
      readonly source: "device";
      readonly availability: LocalPhotoAvailability;
      readonly localOnly: true;
      readonly fingerprint: AssetFingerprint;
    }
  | {
      readonly source: "cloud";
      readonly availability: LocalPhotoAvailability;
      readonly localOnly: false;
      readonly fingerprint: AssetFingerprint;
      readonly visibility: CloudPublicationVisibility;
    };

class UnexpectedLocalPhotoVariantError extends Error {
  override readonly name = "UnexpectedLocalPhotoVariantError";

  constructor() {
    super("Unexpected local photo variant");
  }
}

class InvalidLocalPhotoDomainContractError extends Error {
  override readonly name = "InvalidLocalPhotoDomainContractError";

  constructor() {
    super("Invalid local photo domain contract");
  }
}

const normalizedSha256 = /^[0-9a-f]{64}$/;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExpectedArray(
  value: unknown,
  expected: readonly string[]
): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((entry, index) => entry === expected[index])
  );
}

function parseLocalPhotoDomainContract(value: unknown): LocalPhotoDomainContract | null {
  if (!isRecord(value)) {
    return null;
  }

  const fingerprint = value["fingerprint"];
  const device = value["device"];
  const privacy = value["privacy"];
  if (
    value["schemaVersion"] !== 1 ||
    !hasExpectedArray(value["sources"], localPhotoSources) ||
    !hasExpectedArray(value["availability"], localPhotoAvailability) ||
    !hasExpectedArray(
      value["cloudPublicationVisibility"],
      cloudPublicationVisibility
    ) ||
    !isRecord(fingerprint) ||
    fingerprint["algorithm"] !== "sha-256" ||
    fingerprint["format"] !== "normalized-lowercase-hex" ||
    fingerprint["length"] !== 64 ||
    fingerprint["opaque"] !== true ||
    !isRecord(device) ||
    device["localOnly"] !== true ||
    device["accountIndependent"] !== true ||
    !isRecord(privacy) ||
    privacy["exactLocationLogging"] !== false ||
    privacy["exactLocationSerialization"] !== false
  ) {
    return null;
  }

  return {
    schemaVersion: 1,
    sources: localPhotoSources,
    availability: localPhotoAvailability,
    cloudPublicationVisibility,
    fingerprint: {
      algorithm: "sha-256",
      format: "normalized-lowercase-hex",
      length: 64,
      opaque: true
    },
    device: { localOnly: true, accountIndependent: true },
    privacy: {
      exactLocationLogging: false,
      exactLocationSerialization: false
    }
  };
}

const parsedLocalPhotoDomain = parseLocalPhotoDomainContract(localPhotoDomainJson);
if (parsedLocalPhotoDomain === null) {
  throw new InvalidLocalPhotoDomainContractError();
}

export const localPhotoDomain = parsedLocalPhotoDomain;

function assertNever(value: never): never {
  void value;
  throw new UnexpectedLocalPhotoVariantError();
}

export function parseAssetFingerprint(value: string): AssetFingerprintParseResult {
  if (!normalizedSha256.test(value)) {
    return { kind: "invalid", reason: "normalized-sha256-required" };
  }

  return { kind: "valid", fingerprint: { algorithm: "sha-256", value } };
}

export function createDevicePhoto(input: DevicePhotoInput): DeviceLocalPhoto {
  return {
    source: "device",
    localOnly: true,
    fingerprint: input.fingerprint,
    availability: input.availability,
    privateLocation: input.privateLocation
  };
}

export function createCloudPhoto(input: CloudPhotoInput): CloudLocalPhoto {
  return {
    source: "cloud",
    localOnly: false,
    fingerprint: input.fingerprint,
    availability: input.availability,
    visibility: input.visibility
  };
}

export function transitionLocalPhotoAvailability(
  photo: LocalPhoto,
  availability: LocalPhotoAvailability
): LocalPhoto {
  switch (photo.source) {
    case "device":
      return { ...photo, availability };
    case "cloud":
      return { ...photo, availability };
    default:
      return assertNever(photo);
  }
}

export function getLocalPhotoPublication(photo: LocalPhoto): LocalPhotoPublication {
  switch (photo.source) {
    case "device":
      return { localOnly: true, visibility: null };
    case "cloud":
      return { localOnly: false, visibility: photo.visibility };
    default:
      return assertNever(photo);
  }
}

export function toLocalPhotoDebugSummary(photo: LocalPhoto): LocalPhotoDebugSummary {
  switch (photo.source) {
    case "device":
      return {
        source: photo.source,
        availability: photo.availability,
        localOnly: photo.localOnly,
        hasPrivateLocation: photo.privateLocation !== null
      };
    case "cloud":
      return {
        source: photo.source,
        availability: photo.availability,
        localOnly: photo.localOnly,
        hasPrivateLocation: false
      };
    default:
      return assertNever(photo);
  }
}

export function serializeLocalPhoto(photo: LocalPhoto): SerializedLocalPhoto {
  switch (photo.source) {
    case "device":
      return {
        source: photo.source,
        availability: photo.availability,
        localOnly: photo.localOnly,
        fingerprint: photo.fingerprint
      };
    case "cloud":
      return {
        source: photo.source,
        availability: photo.availability,
        localOnly: photo.localOnly,
        fingerprint: photo.fingerprint,
        visibility: photo.visibility
      };
    default:
      return assertNever(photo);
  }
}
