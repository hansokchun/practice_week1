const loadCapability = async (): Promise<
  typeof import("../src/native-media-capability")
> => jest.requireActual("../src/native-media-capability");

if (process.env["JEST_WORKER_ID"] !== undefined) {
  describe("native media capability contract", () => {
    it("pins the supported operating-system floors", async () => {
    // Given: the Expo SDK 57 native media boundary.
    // When: each platform capability is selected.
    const { getNativeMediaCapability } = await loadCapability();
    const ios = getNativeMediaCapability("ios");
    const android = getNativeMediaCapability("android");

    // Then: unsupported operating-system versions remain outside the contract.
    expect(ios.minimumOsVersion).toBe("16.4");
    expect(android.minimumApiLevel).toBe(24);
  });

  it("maps photo-library access to platform permissions", async () => {
    // Given: the platform permission declarations.
    // When: permission mappings are read from the contract.
    const { getNativeMediaCapability } = await loadCapability();
    const ios = getNativeMediaCapability("ios");
    const android = getNativeMediaCapability("android");

    // Then: Expo and native metadata access requirements are explicit.
    expect(ios.permissions).toEqual({
      read: "NSPhotoLibraryUsageDescription",
      write: "NSPhotoLibraryAddUsageDescription"
    });
    expect(android.permissions).toEqual({
      api24To32Read: "READ_EXTERNAL_STORAGE",
      api33PlusImages: "READ_MEDIA_IMAGES",
      api33PlusVideo: "READ_MEDIA_VIDEO",
      originalLocation: "ACCESS_MEDIA_LOCATION"
    });
  });

  it("derives safe actions from permission transitions", async () => {
    // Given: permission transitions from unrequested and readable states.
    const { resolvePermissionTransition } = await loadCapability();

    // When: Expo access values change.
    const full = resolvePermissionTransition("none", "all");
    const limited = resolvePermissionTransition("all", "limited");
    const denied = resolvePermissionTransition("none", "none");
    const revoked = resolvePermissionTransition("limited", "none");

    // Then: each transition selects a safe next action.
    expect([full, limited, denied, revoked]).toEqual([
      { state: "full", nextAction: "enumerate-all", requiresReconciliation: false },
      {
        state: "limited",
        nextAction: "enumerate-limited",
        requiresReconciliation: true
      },
      { state: "denied", nextAction: "request-access", requiresReconciliation: false },
      { state: "revoked", nextAction: "stop-and-reconcile", requiresReconciliation: true }
    ]);
  });

  it("paginates ten thousand assets without loss and detects offset drift", async () => {
    // Given: 10,000 stable asset IDs and a halfway checkpoint.
    const { enumerateAssetIds } = await loadCapability();
    const assetIds = Array.from({ length: 10_000 }, (_, index) => `asset-${index}`);

    // When: a full run, a resumed run, and a drifted resume are evaluated.
    const full = enumerateAssetIds({ assetIds });
    const firstHalf = enumerateAssetIds({ assetIds, maximumAssets: 5_000 });
    const secondHalf = enumerateAssetIds({ assetIds, checkpoint: firstHalf.checkpoint });
    const drifted = enumerateAssetIds({
      assetIds: ["inserted-before-checkpoint", ...assetIds],
      checkpoint: firstHalf.checkpoint
    });

    // Then: pages are bounded, resumable, complete, unique, and drift-safe.
    const resumedIds = [...firstHalf.pages.flat(), ...secondHalf.pages.flat()];
    expect(full.pages).toHaveLength(40);
    expect(full.pages.every((page) => page.length <= 250)).toBe(true);
    expect(resumedIds).toEqual(assetIds);
    expect(new Set(resumedIds)).toHaveProperty("size", 10_000);
    expect(firstHalf.checkpoint).toEqual({
      offset: 5_000,
      lastAssetId: "asset-4999",
      processedAssetCount: 5_000
    });
    expect(drifted).toMatchObject({ pages: [], reconciliationRequired: true });
  });

  it("resolves metadata and photo resources without inventing device support", async () => {
    // Given: Android metadata, HEIC/iCloud assets, and an iOS Live Photo.
    const { resolveMediaDecision } = await loadCapability();

    // When: each media shape crosses the capability boundary.
    const android = resolveMediaDecision({
      platform: "android",
      format: "jpeg",
      cloudOnly: false,
      livePhoto: false,
      exifPresent: true,
      gpsPresent: true,
      accessMediaLocation: false
    });
    const heic = resolveMediaDecision({
      platform: "ios",
      format: "heic",
      cloudOnly: false,
      livePhoto: false,
      exifPresent: true,
      gpsPresent: true,
      accessMediaLocation: true
    });
    const cloud = resolveMediaDecision({
      platform: "ios",
      format: "jpeg",
      cloudOnly: true,
      livePhoto: false,
      exifPresent: false,
      gpsPresent: false,
      accessMediaLocation: true
    });
    const livePhoto = resolveMediaDecision({
      platform: "ios",
      format: "jpeg",
      cloudOnly: false,
      livePhoto: true,
      exifPresent: true,
      gpsPresent: true,
      accessMediaLocation: true
    });

    // Then: available, unresolved, and native-only resources stay distinct.
    expect(android.metadata).toEqual({
      exif: "requires-access-media-location",
      gps: "requires-access-media-location"
    });
    expect(heic.original).toBe("unresolved-heic");
    expect(cloud.original).toBe("unresolved-icloud-original");
    expect(livePhoto.resources).toEqual({
      representative: "expo-asset",
      pairedVideo: "expo-temporary-video",
      completeResources: "native-phasset-resource-manager"
    });
  });

  it("reconciles lifecycle gaps while applying supported foreground changes", async () => {
    // Given: iOS incremental, Android foreground, and terminated-process events.
    const { resolveLibraryChange } = await loadCapability();

    // When: the events are routed through the lifecycle boundary.
    const iosForeground = resolveLibraryChange({
      platform: "ios",
      event: "foreground-change",
      hasIncrementalDetails: true
    });
    const androidForeground = resolveLibraryChange({
      platform: "android",
      event: "foreground-change",
      hasIncrementalDetails: false
    });
    const resumed = resolveLibraryChange({
      platform: "ios",
      event: "resume-after-termination",
      hasIncrementalDetails: false
    });

    // Then: only the supported iOS event applies incrementally.
    expect(iosForeground).toBe("apply-incremental-change");
    expect(androidForeground).toBe("reconcile-library");
    expect(resumed).toBe("reconcile-library");
  });

  it("requires native Android change tokens until every MediaStore signal exists", async () => {
    // Given: missing and complete Android MediaStore token inputs.
    const { resolveAndroidChangeToken } = await loadCapability();

    // When: the native token requirements are evaluated.
    const missing = resolveAndroidChangeToken({ volume: null, version: null, generation: null });
    const complete = resolveAndroidChangeToken({
      volume: "external_primary",
      version: "v7",
      generation: 42
    });

    // Then: Expo-only input requires native work and complete native data is usable.
    expect(missing).toEqual({
      kind: "native-required",
      missing: ["volume", "version", "generation"]
    });
    expect(complete).toEqual({
      kind: "available",
      checkpoint: "external_primary:v7:42"
    });
  });

  it("never presents the contract as real-device verification", async () => {
    // Given: a locally verified capability contract.
    // When: its verification status is read.
    const { nativeMediaCapability } = await loadCapability();
    const verificationStatus = nativeMediaCapability.realDeviceVerified;

    // Then: the Owner device gate remains open.
    expect(verificationStatus).toBe(false);
  });
  });
}
