import type { DevicePhotoScanResult } from "./device-photo-scan";
import type { DevicePhotoPreview } from "./device-photo-library";
import type { DevicePhotoDetail } from "./device-photo-repository";

export type LocalPhotoRefreshResult = {
  readonly scan: DevicePhotoScanResult;
  readonly photos: readonly DevicePhotoPreview[];
  readonly mapPhotos: readonly DevicePhotoPreview[];
};

export type LocalPhotoIndexingRuntime = {
  readonly index: () => Promise<DevicePhotoScanResult>;
  readonly refresh: (limit?: number) => Promise<LocalPhotoRefreshResult>;
  readonly getPhoto: (assetId: string) => Promise<DevicePhotoDetail | null>;
};

export const localPhotoIndexingRuntime: LocalPhotoIndexingRuntime = {
  async index() {
    throw new Error("Device photo indexing is available only in the native app");
  },
  async refresh() {
    throw new Error("Device photo indexing is available only in the native app");
  },
  async getPhoto() {
    throw new Error("Device photo details are available only in the native app");
  }
};
