import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const expectedContractSha256 =
  "852eb05ae99398f74b0fa7cd4668ad0eaf9279d00ce01e3069c9f4e6c2ab9566";
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultContractPath = resolve(scriptDirectory, "../src/local-photo-domain.json");

const fail = (message) => {
  process.stderr.write(`local-photo-domain: ${message}\n`);
  process.exitCode = 2;
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

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isExactArray = (value, expected) =>
  Array.isArray(value) &&
  value.length === expected.length &&
  value.every((entry, index) => entry === expected[index]);

const isValidContract = (contract) =>
  isRecord(contract) &&
  contract.schemaVersion === 1 &&
  isExactArray(contract.sources, ["device", "cloud"]) &&
  isExactArray(contract.availability, ["available", "missing", "restricted"]) &&
  isExactArray(contract.cloudPublicationVisibility, ["private", "link", "public"]) &&
  isRecord(contract.fingerprint) &&
  contract.fingerprint.algorithm === "sha-256" &&
  contract.fingerprint.format === "normalized-lowercase-hex" &&
  contract.fingerprint.length === 64 &&
  contract.fingerprint.opaque === true &&
  isRecord(contract.device) &&
  contract.device.localOnly === true &&
  contract.device.accountIndependent === true &&
  isRecord(contract.privacy) &&
  contract.privacy.exactLocationLogging === false &&
  contract.privacy.exactLocationSerialization === false;

const argumentsResult = parseArguments(process.argv.slice(2));
if (argumentsResult.kind === "forbidden") {
  fail("exact location display is unavailable");
} else if (argumentsResult.kind === "invalid") {
  fail("invalid arguments; use --contract <path>");
} else {
  try {
    const source = await readFile(argumentsResult.contractPath, "utf8");
    const contract = JSON.parse(source);
    const actualHash = createHash("sha256")
      .update(JSON.stringify(contract))
      .digest("hex");
    if (actualHash !== expectedContractSha256) {
      fail("contract integrity check failed");
    } else if (!isValidContract(contract)) {
      fail("contract structure is invalid");
    } else {
      process.stdout.write(
        `${JSON.stringify(
          {
            result: "PASS",
            sources: contract.sources,
            availability: contract.availability,
            cloudPublicationVisibility: contract.cloudPublicationVisibility,
            fingerprint: contract.fingerprint,
            localOnly: contract.device.localOnly,
            accountIndependent: contract.device.accountIndependent,
            exactLocationLogging: contract.privacy.exactLocationLogging
          },
          null,
          2
        )}\n`
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      fail("contract could not be read or parsed");
    } else {
      throw error;
    }
  }
}
