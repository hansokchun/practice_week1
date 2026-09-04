type JsonRecord = { readonly [key: string]: unknown };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readContract(): JsonRecord {
  const parsed: unknown = jest.requireActual("../src/privacy-media-policy.json");
  if (!isRecord(parsed)) {
    throw new TypeError("privacy media policy must be an object");
  }
  return parsed;
}

function recordAt(record: JsonRecord, key: string): JsonRecord {
  const value = record[key];
  if (!isRecord(value)) {
    throw new TypeError(`expected ${key} to be an object`);
  }
  return value;
}

function stringArrayAt(record: JsonRecord, key: string): readonly string[] {
  const value = record[key];
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new TypeError(`expected ${key} to be a string array`);
  }
  return value;
}

function dataMap(contract: JsonRecord): readonly JsonRecord[] {
  const value = contract["dataMap"];
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new TypeError("expected dataMap to be an array of objects");
  }
  return value;
}

if (process.env["JEST_WORKER_ID"] !== undefined) {
  describe("privacy media policy contract", () => {
  it("keeps originals local while publication only accepts still-photo derivatives", () => {
    // Given: the mobile publication policy and its media rules.
    const contract = readContract();
    const media = recordAt(contract, "media");
    const originals = recordAt(contract, "originals");
    const heic = recordAt(media, "heic");
    const raw = recordAt(media, "raw");
    const video = recordAt(media, "video");

    // When: publication and unsupported-media decisions are evaluated together.
    const publicationBlocked =
      originals["serverUploadedAutomatically"] === false &&
      originals["durableAppStorageClone"] === false;

    // Then: only still photos publish, HEIC is converted first, and unsupported inputs show copy.
    expect(media["stillPhotosOnly"]).toBe(true);
    expect(publicationBlocked).toBe(true);
    expect(heic["convertBeforeCloudPublication"]).toBe(true);
    expect(raw["supported"]).toBe(false);
    expect(video["supported"]).toBe(false);
    expect(raw["unsupportedUserCopyKey"]).toEqual(expect.any(String));
    expect(video["unsupportedUserCopyKey"]).toEqual(expect.any(String));
  });

  it("makes temporary derivative storage bounded and restart-safe", () => {
    // Given: the derivative lifecycle policy and a restart fixture.
    const contract = readContract();
    const derivatives = recordAt(contract, "derivatives");
    const fixture = recordAt(derivatives, "crashRestartFixture");
    const before = recordAt(fixture, "before");
    const expected = recordAt(fixture, "expected");
    const maximumLifetimeMinutes = derivatives["maximumLifetimeMinutes"];

    // When: a terminated process restarts with an expired temporary derivative.
    const restartDeletesExpiredDerivative =
      fixture["event"] === "app-start" &&
      before["processState"] === "terminated" &&
      typeof before["ageMinutes"] === "number" &&
      typeof maximumLifetimeMinutes === "number" &&
      before["ageMinutes"] > maximumLifetimeMinutes;

    // Then: the cache-only derivative is deleted and publication returns to its original source.
    expect(derivatives["location"]).toEqual(expect.any(String));
    expect(maximumLifetimeMinutes).toEqual(expect.any(Number));
    expect(restartDeletesExpiredDerivative).toBe(true);
    expect(expected).toEqual({
      deleteDerivative: true,
      publicationState: "rebuild-from-original"
    });
    expect(stringArrayAt(derivatives, "deletionTriggers")).toEqual(
      expect.arrayContaining(["publication-complete", "cancelled", "permission-revoked", "expiry"])
    );
    expect(recordAt(derivatives, "retry")["requiresOriginalReacquisition"]).toBe(true);
  });

  it("has the four permission states and stops local access after denial or revocation", () => {
    // Given: each policy permission state.
    const contract = readContract();
    const permissions = recordAt(contract, "permissions");
    const requiredStates = ["full", "limited", "denied", "revoked"];

    // When: their access and UX effects are inspected.
    const inaccessibleStates = requiredStates.filter(
      (state) => recordAt(permissions, state)["canReadOriginals"] === false
    );

    // Then: full and limited access are distinct, while denied and revoked stop local reads.
    expect(Object.keys(permissions).sort()).toEqual([...requiredStates].sort());
    expect(recordAt(permissions, "full")["canReadOriginals"]).toBe(true);
    expect(recordAt(permissions, "limited")["canReadOriginals"]).toBe(true);
    expect(recordAt(permissions, "limited")["requiresReconciliation"]).toBe(true);
    expect(inaccessibleStates.sort()).toEqual(["denied", "revoked"]);
    expect(recordAt(permissions, "revoked")["requiresReconciliation"]).toBe(true);
  });

  it("defaults GPS to local-only and assigns every transfer an explicit recipient and lifecycle", () => {
    // Given: GPS transfer policy and the privacy data map.
    const contract = readContract();
    const gps = recordAt(contract, "gps");
    const transfers = stringArrayAt(gps, "allowedTransferRecipients");
    const map = dataMap(contract);

    // When: GPS rows are routed from source to destination.
    const gpsRows = map.filter((entry) => entry["datum"] === "exact-gps");

    // Then: exact coordinates are local by default and each listed destination has a recipient, purpose, retention, deletion, and backup status.
    expect(gps["defaultDisclosure"]).toBe("local-only");
    expect(gps["publicDisclosure"]).toBe("saved-coordinate-with-author-selected-accuracy");
    expect(transfers).toEqual(["Supabase Postgres"]);
    expect(gpsRows.length).toBeGreaterThan(0);
    for (const row of map) {
      expect(row["source"]).toEqual(expect.any(String));
      expect(row["localDestination"]).toEqual(expect.any(String));
      expect(row["serverDestination"]).toEqual(expect.any(String));
      expect(row["purpose"]).toEqual(expect.any(String));
      expect(row["retention"]).toEqual(expect.any(String));
      expect(row["deletionTrigger"]).toEqual(expect.any(String));
      expect(row["backupStatus"]).toEqual(expect.any(String));
    }
    for (const row of gpsRows) {
      expect(row["recipient"]).toEqual(expect.any(String));
      expect(transfers).toContain(row["recipient"]);
    }
  });

  it("bounds thumbnail cache to exactly 512 MiB and excludes local database and cache backups", () => {
    // Given: cache and local persistence policy.
    const contract = readContract();
    const cache = recordAt(contract, "thumbnailCache");
    const localPersistence = recordAt(contract, "localPersistence");

    // When: cache capacity and eviction behavior are evaluated.
    const cacheIsBounded =
      cache["maximumMiB"] === 512 && cache["eviction"] === "least-recently-used-before-write";

    // Then: neither cached thumbnails nor local state enter platform backup.
    expect(cacheIsBounded).toBe(true);
    expect(cache["backupExcluded"]).toBe(true);
    expect(localPersistence["databaseBackupExcluded"]).toBe(true);
    expect(localPersistence["cacheBackupExcluded"]).toBe(true);
  });

  it("keeps offline work queued without automatic transfer and declares zero mobile album features", () => {
    // Given: publication, offline, and mobile feature policy.
    const contract = readContract();
    const offline = recordAt(contract, "offline");
    const publication = recordAt(contract, "publication");
    const accountDeletion = recordAt(contract, "accountDeletion");

    // When: connectivity is unavailable or an account is deleted.
    const noAutomaticTransfer =
      offline["automaticServerUpload"] === false && publication["requiresExplicitUserAction"] === true;

    // Then: no content transfers in the background, publication boundaries remain explicit, and local cache cleanup occurs.
    expect(noAutomaticTransfer).toBe(true);
    expect(offline["onDemandOriginalFailure"]).toBe("show-retry-without-cloning-original");
    expect(publication["visibilities"]).toEqual(["private", "link", "public"]);
    expect(accountDeletion["clearsLocalCacheAndDatabase"]).toBe(true);
    expect(contract["albumFeatures"]).toBe(0);
  });
  });
}
