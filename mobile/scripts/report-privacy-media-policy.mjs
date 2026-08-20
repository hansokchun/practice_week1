import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const expectedContractSha256 =
  "f719302930f09b767260e33281006090000a78ff2df9cf7a2ad53daf661f4adc";
const expectedSourceDate = "2026-08-21";
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultContractPath = resolve(scriptDirectory, "../src/privacy-media-policy.json");
const requiredPermissionStates = ["full", "limited", "denied", "revoked"];
const requiredDerivativeTriggers = [
  "publication-complete",
  "cancelled",
  "permission-revoked",
  "expiry",
  "startup-crash-recovery"
];
const requiredDataMapFields = [
  "datum",
  "source",
  "localDestination",
  "serverDestination",
  "recipient",
  "purpose",
  "retention",
  "deletionTrigger",
  "backupStatus"
];
const requiredDataMapDatums = [
  "OS-original-reference",
  "temporary-publication-derivative",
  "thumbnail-cache",
  "exact-gps",
  "publication-visibility-and-link-token"
];

const fail = (message) => {
  process.stderr.write(`privacy-media-policy: ${message}\n`);
  process.exitCode = 2;
};

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

const isExactArray = (value, expected) =>
  Array.isArray(value) &&
  value.length === expected.length &&
  value.every((entry, index) => entry === expected[index]);

const includesAllStrings = (value, required) =>
  Array.isArray(value) && required.every((entry) => value.includes(entry));

const hasNonemptyString = (record, key) =>
  typeof record[key] === "string" && record[key].trim() !== "";

const hasCompleteDataMap = (value) =>
  Array.isArray(value) &&
  value.length === requiredDataMapDatums.length &&
  value.every(
    (entry) =>
      isRecord(entry) && requiredDataMapFields.every((field) => hasNonemptyString(entry, field))
  ) &&
  isExactArray(
    value.map((entry) => entry.datum),
    requiredDataMapDatums
  );

const getRecord = (record, key) => (isRecord(record[key]) ? record[key] : null);

const isValidContract = (contract) => {
  if (!isRecord(contract) || contract.schemaVersion !== 1) {
    return false;
  }
  if (contract.contractSourceDate !== expectedSourceDate || contract.policyVersion !== "task-5-v1") {
    return false;
  }

  const media = getRecord(contract, "media");
  const originals = getRecord(contract, "originals");
  const publication = getRecord(contract, "publication");
  const derivatives = getRecord(contract, "derivatives");
  const cache = getRecord(contract, "thumbnailCache");
  const persistence = getRecord(contract, "localPersistence");
  const permissions = getRecord(contract, "permissions");
  const gps = getRecord(contract, "gps");
  const offline = getRecord(contract, "offline");
  const accountDeletion = getRecord(contract, "accountDeletion");
  const sourceSnapshot = getRecord(contract, "sourceSnapshot");

  if (
    media === null ||
    originals === null ||
    publication === null ||
    derivatives === null ||
    cache === null ||
    persistence === null ||
    permissions === null ||
    gps === null ||
    offline === null ||
    accountDeletion === null ||
    sourceSnapshot === null
  ) {
    return false;
  }

  const heic = getRecord(media, "heic");
  const raw = getRecord(media, "raw");
  const video = getRecord(media, "video");
  const retry = getRecord(derivatives, "retry");
  const fixture = getRecord(derivatives, "crashRestartFixture");
  const fixtureBefore = fixture === null ? null : getRecord(fixture, "before");
  const fixtureExpected = fixture === null ? null : getRecord(fixture, "expected");

  if (
    heic === null ||
    raw === null ||
    video === null ||
    retry === null ||
    fixture === null ||
    fixtureBefore === null ||
    fixtureExpected === null
  ) {
    return false;
  }

  const permissionsAreComplete =
    isExactArray(Object.keys(permissions).sort(), [...requiredPermissionStates].sort()) &&
    requiredPermissionStates.every((state) => isRecord(permissions[state]));
  const full = getRecord(permissions, "full");
  const limited = getRecord(permissions, "limited");
  const denied = getRecord(permissions, "denied");
  const revoked = getRecord(permissions, "revoked");

  if (full === null || limited === null || denied === null || revoked === null) {
    return false;
  }

  const dataMapIsComplete = hasCompleteDataMap(contract.dataMap);
  const exactGpsRow = dataMapIsComplete
    ? contract.dataMap.find((entry) => entry.datum === "exact-gps")
    : undefined;

  return (
    media.stillPhotosOnly === true &&
    isExactArray(media.acceptedFormats, ["jpeg", "png", "webp", "heic"]) &&
    heic.supported === true &&
    heic.convertBeforeCloudPublication === true &&
    heic.publicationDerivativeFormat === "jpeg" &&
    raw.supported === false &&
    hasNonemptyString(raw, "unsupportedUserCopyKey") &&
    video.supported === false &&
    hasNonemptyString(video, "unsupportedUserCopyKey") &&
    originals.authoritativeLocation === "PhotoKit-or-MediaStore" &&
    originals.serverUploadedAutomatically === false &&
    originals.durableAppStorageClone === false &&
    originals.offlineOriginalTransfer === false &&
    hasNonemptyString(originals, "osDeletionHandling") &&
    hasNonemptyString(originals, "permissionRevocationHandling") &&
    publication.requiresExplicitUserAction === true &&
    isExactArray(publication.visibilities, ["private", "link", "public"]) &&
    isExactArray(publication.serverRecipients, ["Supabase Storage", "Supabase Postgres"]) &&
    hasNonemptyString(publication, "retention") &&
    hasNonemptyString(publication, "deletionTrigger") &&
    derivatives.location === "FileSystem.cacheDirectory/ikkyee-derivatives" &&
    derivatives.maximumLifetimeMinutes === 60 &&
    derivatives.durableStorage === false &&
    derivatives.backupExcluded === true &&
    includesAllStrings(derivatives.deletionTriggers, requiredDerivativeTriggers) &&
    retry.maximumAttempts === 3 &&
    retry.requiresOriginalReacquisition === true &&
    retry.doesNotRetainFailedDerivative === true &&
    fixture.event === "app-start" &&
    fixtureBefore.processState === "terminated" &&
    fixtureBefore.hasTemporaryDerivative === true &&
    fixtureBefore.ageMinutes > derivatives.maximumLifetimeMinutes &&
    fixtureExpected.deleteDerivative === true &&
    fixtureExpected.publicationState === "rebuild-from-original" &&
    cache.location === "FileSystem.cacheDirectory/ikkyee-thumbnails" &&
    cache.maximumMiB === 512 &&
    cache.eviction === "least-recently-used-before-write" &&
    cache.backupExcluded === true &&
    persistence.databaseBackupExcluded === true &&
    persistence.cacheBackupExcluded === true &&
    permissionsAreComplete &&
    full.canReadOriginals === true &&
    limited.canReadOriginals === true &&
    limited.requiresReconciliation === true &&
    denied.canReadOriginals === false &&
    revoked.canReadOriginals === false &&
    revoked.requiresReconciliation === true &&
    gps.defaultDisclosure === "local-only" &&
    gps.publicDisclosure === "approximate-or-hidden-only" &&
    isExactArray(gps.allowedTransferRecipients, ["Supabase Postgres"]) &&
    hasNonemptyString(gps, "transferPurpose") &&
    hasNonemptyString(gps, "retention") &&
    hasNonemptyString(gps, "deletionTrigger") &&
    hasNonemptyString(gps, "backupStatus") &&
    offline.automaticServerUpload === false &&
    offline.onDemandOriginalFailure === "show-retry-without-cloning-original" &&
    hasNonemptyString(offline, "icloudOrCloudMediaFailure") &&
    accountDeletion.clearsLocalCacheAndDatabase === true &&
    accountDeletion.removesPendingPublicationJobs === true &&
    accountDeletion.removesServerPublications === true &&
    accountDeletion.doesNotDeleteOSOriginals === true &&
    contract.albumFeatures === 0 &&
    dataMapIsComplete &&
    isRecord(exactGpsRow) &&
    exactGpsRow.recipient === "Supabase Postgres" &&
    exactGpsRow.serverDestination.includes("Supabase Postgres") &&
    sourceSnapshot.accessDate === expectedSourceDate &&
    Array.isArray(sourceSnapshot.officialSources) &&
    sourceSnapshot.officialSources.length >= 8 &&
    sourceSnapshot.officialSources.every((source) => typeof source === "string" && source.startsWith("https://"))
  );
};

const parseArguments = (argumentsToParse) => {
  if (argumentsToParse.includes("--show-exact-location")) {
    return { kind: "forbidden" };
  }
  if (argumentsToParse.length === 0) {
    return { kind: "valid", contractPath: defaultContractPath };
  }
  if (argumentsToParse.length === 2 && argumentsToParse[0] === "--contract") {
    return { kind: "valid", contractPath: resolve(argumentsToParse[1]) };
  }
  return { kind: "invalid" };
};

const argumentsResult = parseArguments(process.argv.slice(2));
if (argumentsResult.kind === "forbidden") {
  fail("exact location display is unavailable");
} else if (argumentsResult.kind === "invalid") {
  fail("invalid arguments; use --contract <path>");
} else {
  try {
    const source = await readFile(argumentsResult.contractPath, "utf8");
    const contract = JSON.parse(source);
    const actualHash = createHash("sha256").update(JSON.stringify(contract)).digest("hex");
    if (actualHash !== expectedContractSha256) {
      fail("contract integrity check failed");
    } else if (!isValidContract(contract)) {
      fail("contract structure is invalid");
    } else {
      process.stdout.write(
        `${JSON.stringify({
          result: "PASS",
          stillPhotosOnly: true,
          heicPublicationConversion: true,
          rawSupported: false,
          videoSupported: false,
          originalsServerUploadedAutomatically: false,
          durableOriginalClone: false,
          cacheLimitMiB: 512,
          backupExcluded: true,
          exactGpsDefault: "localOnly",
          permissionStates: requiredPermissionStates,
          albumFeatures: 0,
          completeDataMap: true,
          offlineSummary: "explicit-publication-only; retry-without-original-clone",
          derivativeCleanupSummary: "cache-only; 60-minute-expiry; startup-recovery"
        })}\n`
      );
    }
  } catch {
    fail("contract could not be read or parsed");
  }
}
