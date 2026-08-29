import {
  readSafeDevicePhotoMetadata,
  type DevicePhotoMetadataAsset
} from "../src/device-photo-metadata";

function createAsset(
  overrides: Partial<DevicePhotoMetadataAsset> = {}
): DevicePhotoMetadataAsset {
  return {
    getExif: jest.fn(async () => ({})),
    getLocation: jest.fn(async () => null),
    getMediaSubtypes: jest.fn(async () => []),
    ...overrides
  };
}

describe("safe device photo metadata", () => {
  it("normalizes capture time and location while removing GPS fields from EXIF JSON", async () => {
    const metadata = await readSafeDevicePhotoMetadata(createAsset({
      getExif: async () => ({
        DateTimeOriginal: "2024:03:05 14:06:07",
        Make: "Camera Corp",
        Model: "Traveler 1",
        GPSLatitude: 37.5665,
        GPSLongitude: 126.978,
        MakerNote: { private: true }
      }),
      getLocation: async () => ({ latitude: 37.5665, longitude: 126.978 })
    }), "ios");

    expect(metadata).toMatchObject({
      mediaType: "photo",
      capturedAt: "2024-03-05T14:06:07",
      latitude: 37.5665,
      longitude: 126.978
    });
    expect(JSON.parse(metadata.exifJson)).toEqual({
      DateTimeOriginal: "2024:03:05 14:06:07",
      Make: "Camera Corp",
      Model: "Traveler 1"
    });
  });

  it("detects Live Photos without extracting or retaining the paired video", async () => {
    const asset = createAsset({
      getMediaSubtypes: jest.fn(async () => ["livePhoto", "hdr"])
    });

    await expect(readSafeDevicePhotoMetadata(asset, "ios")).resolves.toMatchObject({
      mediaType: "live_photo"
    });
    expect(asset.getMediaSubtypes).toHaveBeenCalledTimes(1);
  });

  it("rejects partial or out-of-range coordinates and malformed EXIF values", async () => {
    const metadata = await readSafeDevicePhotoMetadata(createAsset({
      getExif: async () => ({
        DateTimeOriginal: "not-a-date",
        Make: "x".repeat(300),
        Orientation: 99
      }),
      getLocation: async () => ({ latitude: 91, longitude: 126 })
    }), "android");

    expect(metadata).toEqual({
      mediaType: "photo",
      capturedAt: null,
      latitude: null,
      longitude: null,
      exifJson: "{}"
    });
  });

  it("turns native getter failures into an unavailable marker instead of leaking errors", async () => {
    const metadata = await readSafeDevicePhotoMetadata(createAsset({
      getExif: async () => { throw new Error("content://private/path"); },
      getLocation: async () => { throw new Error("permission detail"); },
      getMediaSubtypes: async () => { throw new Error("asset internals"); }
    }), "ios");

    expect(metadata).toEqual({
      mediaType: "photo",
      capturedAt: null,
      latitude: null,
      longitude: null,
      exifJson: '{"status":"unavailable"}'
    });
  });
});
