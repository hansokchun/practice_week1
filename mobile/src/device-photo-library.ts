import type { PermissionState, PermissionTransition } from "./native-media-capability";
import { resolvePermissionTransition } from "./native-media-capability";
import type { DevicePhotoPageSource } from "./device-photo-scan";

export type PhotoLibraryAccess = "all" | "limited" | "none";

export type PhotoLibraryPermissionResponse = {
  readonly accessPrivileges?: PhotoLibraryAccess;
  readonly canAskAgain: boolean;
  readonly granted: boolean;
};

export type DevicePhotoPreview = {
  readonly id: string;
  readonly filename: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly creationTime: number | null;
  readonly modificationTime?: number | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly thumbnailUri?: string;
};

export type DevicePhotoLibraryAdapter = {
  readonly getPermission: () => Promise<PhotoLibraryPermissionResponse>;
  readonly requestPermission: () => Promise<PhotoLibraryPermissionResponse>;
  readonly manageLimitedAccess: () => Promise<void>;
  readonly listPhotos: (limit: number) => Promise<readonly DevicePhotoPreview[]>;
};

export type ResolvedPhotoLibraryPermission = PermissionTransition & {
  readonly access: PhotoLibraryAccess;
  readonly canAskAgain: boolean;
};

const PREVIEW_LIMIT = 60;

function normalizeAccess(response: PhotoLibraryPermissionResponse): PhotoLibraryAccess {
  if (response.accessPrivileges !== undefined) return response.accessPrivileges;
  return response.granted ? "all" : "none";
}

export function resolvePhotoLibraryPermission(
  previousAccess: PhotoLibraryAccess,
  response: PhotoLibraryPermissionResponse
): ResolvedPhotoLibraryPermission {
  const access = normalizeAccess(response);
  return {
    ...resolvePermissionTransition(previousAccess, access),
    access,
    canAskAgain: response.canAskAgain
  };
}

export async function loadAuthorizedPhotoPreview(
  adapter: Pick<DevicePhotoLibraryAdapter, "listPhotos">,
  permissionState: PermissionState
): Promise<readonly DevicePhotoPreview[]> {
  if (permissionState !== "full" && permissionState !== "limited") return [];
  return adapter.listPhotos(PREVIEW_LIMIT);
}

async function listExpoPhotoPage(offset: number, limit: number): Promise<readonly DevicePhotoPreview[]> {
  const mediaLibrary = await import("expo-media-library");
  const assets = await new mediaLibrary.Query()
    .eq(mediaLibrary.AssetField.MEDIA_TYPE, mediaLibrary.MediaType.IMAGE)
    .orderBy({ key: mediaLibrary.AssetField.CREATION_TIME, ascending: false })
    .offset(offset)
    .limit(limit)
    .exeForMetadata();
  return assets.map(({ id, filename, width, height, creationTime, modificationTime }) => ({
    id,
    filename,
    width,
    height,
    creationTime,
    modificationTime
  }));
}

export const expoDevicePhotoPageSource: DevicePhotoPageSource = {
  listPhotoPage: ({ offset, limit }) => listExpoPhotoPage(offset, limit)
};

export const expoDevicePhotoLibraryAdapter: DevicePhotoLibraryAdapter = {
  async getPermission() {
    const mediaLibrary = await import("expo-media-library");
    return mediaLibrary.getPermissionsAsync(false, ["photo"]);
  },
  async requestPermission() {
    const mediaLibrary = await import("expo-media-library");
    return mediaLibrary.requestPermissionsAsync(false, ["photo"]);
  },
  async manageLimitedAccess() {
    const mediaLibrary = await import("expo-media-library");
    await mediaLibrary.presentPermissionsPicker(["photo"]);
  },
  async listPhotos(limit) {
    return listExpoPhotoPage(0, limit);
  }
};
