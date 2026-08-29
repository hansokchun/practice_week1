import {
  getPrivateMapPosition,
  getPrivateLocationFromMapPress,
  isDevicePhotoLocationMissing
} from "../src/device-photo-location";

describe("private device photo location", () => {
  it("detects missing or partial coordinates", () => {
    expect(isDevicePhotoLocationMissing({ latitude: null, longitude: null })).toBe(true);
    expect(isDevicePhotoLocationMissing({ latitude: 37.5, longitude: null })).toBe(true);
    expect(isDevicePhotoLocationMissing({ latitude: 37.5, longitude: 126.9 })).toBe(false);
  });

  it("converts a local Korea-map press into bounded private coordinates", () => {
    const location = getPrivateLocationFromMapPress({ x: 160, y: 180, width: 320, height: 360 });
    expect(location).toEqual({ latitude: 0, longitude: 0 });
    expect(getPrivateMapPosition(location)).toEqual({ leftPercent: 50, topPercent: 50 });
  });

  it("clamps presses outside the local map without serializing display copy", () => {
    expect(getPrivateLocationFromMapPress({ x: -10, y: 999, width: 320, height: 360 }))
      .toEqual({ latitude: -85, longitude: -180 });
  });
});
