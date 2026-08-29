import type { PrivateDevicePhotoLocation } from "./device-photo-location";

export type LocalPhotoLocationRuntime = {
  readonly getLocation: (assetId: string) => Promise<PrivateDevicePhotoLocation | null>;
  readonly saveLocation: (
    assetId: string,
    location: PrivateDevicePhotoLocation
  ) => Promise<void>;
};

export const localPhotoLocationRuntime: LocalPhotoLocationRuntime = {
  async getLocation() {
    throw new Error("Private device photo locations are available only in the native app");
  },
  async saveLocation() {
    throw new Error("Private device photo locations are available only in the native app");
  }
};
