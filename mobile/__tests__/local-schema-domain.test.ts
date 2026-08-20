const loadDomain = async (): Promise<typeof import("../src/local-photo-domain")> =>
  jest.requireActual("../src/local-photo-domain");

const fingerprintText =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

if (process.env["JEST_WORKER_ID"] !== undefined) {
  describe("local photo domain contract", () => {
    it("creates valid device and cloud records", async () => {
      // Given: a normalized opaque fingerprint for each local photo source.
      const { createCloudPhoto, createDevicePhoto, parseAssetFingerprint } =
        await loadDomain();
      const fingerprintResult = parseAssetFingerprint(fingerprintText);

      // When: device and cloud records are created from the validated fingerprint.
      expect(fingerprintResult.kind).toBe("valid");
      if (fingerprintResult.kind !== "valid") {
        throw new Error("fixture fingerprint must be valid");
      }
      const device = createDevicePhoto({
        fingerprint: fingerprintResult.fingerprint,
        availability: "available",
        privateLocation: { latitude: 37.5665, longitude: 126.978 }
      });
      const cloud = createCloudPhoto({
        fingerprint: fingerprintResult.fingerprint,
        availability: "available",
        visibility: "link"
      });

      // Then: source-specific invariants are retained without account ownership data.
      expect(device).toMatchObject({ source: "device", localOnly: true });
      expect(cloud).toMatchObject({ source: "cloud", visibility: "link" });
      expect(Object.hasOwn(device, "accountId")).toBe(false);
      expect(Object.hasOwn(device, "ownerId")).toBe(false);
    });

    it("preserves local data through availability transitions", async () => {
      // Given: an available device original with private local coordinates.
      const {
        createDevicePhoto,
        parseAssetFingerprint,
        transitionLocalPhotoAvailability
      } = await loadDomain();
      const fingerprintResult = parseAssetFingerprint(fingerprintText);
      expect(fingerprintResult.kind).toBe("valid");
      if (fingerprintResult.kind !== "valid") {
        throw new Error("fixture fingerprint must be valid");
      }
      const available = createDevicePhoto({
        fingerprint: fingerprintResult.fingerprint,
        availability: "available",
        privateLocation: { latitude: 37.5665, longitude: 126.978 }
      });

      // When: access moves through missing, restricted, and available again.
      const missing = transitionLocalPhotoAvailability(available, "missing");
      const restricted = transitionLocalPhotoAvailability(missing, "restricted");
      const restored = transitionLocalPhotoAvailability(restricted, "available");

      // Then: availability changes without losing the source, fingerprint, or private location.
      expect([missing.availability, restricted.availability, restored.availability]).toEqual([
        "missing",
        "restricted",
        "available"
      ]);
      expect(restored).toMatchObject({
        source: "device",
        localOnly: true,
        fingerprint: available.fingerprint,
        privateLocation: available.privateLocation
      });
    });

    it("limits publication visibility to cloud records while device originals stay local", async () => {
      // Given: one device original and one cloud publication for each allowed visibility.
      const {
        createCloudPhoto,
        createDevicePhoto,
        getLocalPhotoPublication,
        parseAssetFingerprint
      } = await loadDomain();
      const fingerprintResult = parseAssetFingerprint(fingerprintText);
      expect(fingerprintResult.kind).toBe("valid");
      if (fingerprintResult.kind !== "valid") {
        throw new Error("fixture fingerprint must be valid");
      }
      const device = createDevicePhoto({
        fingerprint: fingerprintResult.fingerprint,
        availability: "available",
        privateLocation: null
      });
      const cloudPublications = (["private", "link", "public"] as const).map(
        (visibility) =>
          createCloudPhoto({
            fingerprint: fingerprintResult.fingerprint,
            availability: "available",
            visibility
          })
      );

      // When: publication policy is derived from each source-specific record.
      const devicePublication = getLocalPhotoPublication(device);
      const cloudPublicationsResult = cloudPublications.map(getLocalPhotoPublication);

      // Then: only cloud records expose visibility and device originals remain local-only.
      expect(devicePublication).toEqual({ localOnly: true, visibility: null });
      expect(cloudPublicationsResult).toEqual([
        { localOnly: false, visibility: "private" },
        { localOnly: false, visibility: "link" },
        { localOnly: false, visibility: "public" }
      ]);
    });

    it("redacts exact coordinates from every debug and serialized representation", async () => {
      // Given: a device original whose private local record has exact coordinates.
      const {
        createDevicePhoto,
        parseAssetFingerprint,
        serializeLocalPhoto,
        toLocalPhotoDebugSummary
      } = await loadDomain();
      const fingerprintResult = parseAssetFingerprint(fingerprintText);
      expect(fingerprintResult.kind).toBe("valid");
      if (fingerprintResult.kind !== "valid") {
        throw new Error("fixture fingerprint must be valid");
      }
      const device = createDevicePhoto({
        fingerprint: fingerprintResult.fingerprint,
        availability: "available",
        privateLocation: { latitude: 37.5665, longitude: 126.978 }
      });

      // When: the record crosses debug and persistence-safe representation boundaries.
      const debugOutput = JSON.stringify(toLocalPhotoDebugSummary(device));
      const serializedOutput = JSON.stringify(serializeLocalPhoto(device));

      // Then: neither representation exposes coordinate values or location fields.
      expect(debugOutput).not.toContain("37.5665");
      expect(debugOutput).not.toContain("126.978");
      expect(serializedOutput).not.toContain("37.5665");
      expect(serializedOutput).not.toContain("126.978");
      expect(debugOutput).not.toMatch(/latitude|longitude/i);
      expect(serializedOutput).not.toMatch(/latitude|longitude/i);
    });

    it("accepts only normalized lowercase SHA-256 fingerprint text", async () => {
      // Given: normalized, uppercase, short, and non-hex fingerprint candidates.
      const { parseAssetFingerprint } = await loadDomain();
      const uppercase = fingerprintText.toUpperCase();
      const short = fingerprintText.slice(0, 63);
      const nonHex = `${fingerprintText.slice(0, 63)}g`;

      // When: each candidate crosses the opaque fingerprint boundary.
      const results = [fingerprintText, uppercase, short, nonHex].map(parseAssetFingerprint);

      // Then: only exactly 64 normalized lowercase hexadecimal characters are accepted.
      expect(results.map((result) => result.kind)).toEqual([
        "valid",
        "invalid",
        "invalid",
        "invalid"
      ]);
    });
  });
}
