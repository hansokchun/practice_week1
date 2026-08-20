import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const expectedContractSha256 =
  "f1a5defce97fdbf6f3d52a2131ca6a68e92818c50aa26dfbf5fe2997d7641ba2";
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultContractPath = resolve(
  scriptDirectory,
  "../src/native-media-capabilities.json"
);

const fail = (message) => {
  process.stderr.write(`native-capability: ${message}\n`);
  process.exitCode = 2;
};

const parseArguments = (argumentsToParse) => {
  let platform;
  let contractPath = defaultContractPath;

  for (let index = 0; index < argumentsToParse.length; index += 2) {
    const option = argumentsToParse[index];
    const value = argumentsToParse[index + 1];
    if (value === undefined) {
      return undefined;
    }
    if (option === "--platform") {
      platform = value;
    } else if (option === "--contract") {
      contractPath = resolve(value);
    } else {
      return undefined;
    }
  }

  if (platform !== "ios" && platform !== "android") {
    return undefined;
  }
  return { contractPath, platform };
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const argumentsResult = parseArguments(process.argv.slice(2));
if (argumentsResult === undefined) {
  fail("invalid arguments; use --platform ios or --platform android");
} else {
  try {
    const source = await readFile(argumentsResult.contractPath, "utf8");
    const contract = JSON.parse(source);
    const actualHash = createHash("sha256")
      .update(JSON.stringify(contract))
      .digest("hex");
    if (actualHash !== expectedContractSha256) {
      fail("contract integrity check failed");
    } else {
      if (!isRecord(contract) || !isRecord(contract.platforms)) {
        fail("contract structure is invalid");
      } else {
        const capability = contract.platforms[argumentsResult.platform];
        if (!isRecord(capability)) {
          fail("contract platform data is invalid");
        } else {
          const minimumOs =
            argumentsResult.platform === "ios"
              ? `iOS ${capability.minimumOsVersion}`
              : `Android API ${capability.minimumApiLevel}`;
          const report = {
            result: "PASS",
            platform: argumentsResult.platform,
            minimumOs,
            expoCapabilities: capability.expo,
            permissionStates: contract.permissionStates,
            unresolvedDeviceProbes: capability.unresolvedDeviceProbes,
            nativeGaps: capability.nativeGaps,
            realDeviceVerified: contract.realDeviceVerified,
            ownerGate: "DEFERRED_REAL_DEVICE"
          };
          process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      fail("contract could not be read or parsed");
    } else {
      throw error;
    }
  }
}
