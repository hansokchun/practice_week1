import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (path) => JSON.parse(readFileSync(resolve(mobileRoot, path), "utf8"));

const app = readJson("app.json").expo;
const eas = readJson("eas.json");
const contract = readJson("release-contract.json");

function resolveProfile(name, seen = new Set()) {
  assert.equal(seen.has(name), false, `Circular EAS profile inheritance: ${name}`);
  const profile = eas.build[name];
  assert.ok(profile, `Missing EAS profile: ${name}`);
  if (typeof profile.extends !== "string") return profile;
  const parent = resolveProfile(profile.extends, new Set([...seen, name]));
  return {
    ...parent,
    ...profile,
    env: { ...(parent.env ?? {}), ...(profile.env ?? {}) },
    ios: { ...(parent.ios ?? {}), ...(profile.ios ?? {}) },
    android: { ...(parent.android ?? {}), ...(profile.android ?? {}) },
  };
}

assert.equal(app.version, contract.marketingVersion);
assert.equal(app.ios.bundleIdentifier, contract.identifiers.ios);
assert.equal(app.ios.buildNumber, contract.buildNumbers.iosInitial);
assert.equal(app.android.package, contract.identifiers.android);
assert.equal(app.android.versionCode, contract.buildNumbers.androidInitial);
assert.equal(eas.cli.appVersionSource, contract.buildNumbers.source);
assert.equal(eas.build.production.autoIncrement, contract.buildNumbers.productionAutoIncrement);

for (const [profileName, profileContract] of Object.entries(contract.profiles)) {
  const profile = resolveProfile(profileName);
  assert.equal(profile.channel, profileContract.channel);
  assert.equal(profile.env.EXPO_PUBLIC_APP_ENV, profileContract.appEnvironment);
}

assert.equal(eas.build.development.developmentClient, true);
assert.equal(eas.build["development-simulator"].ios.simulator, true);
assert.equal(eas.build.preview.developmentClient, false);
assert.equal(eas.build.preview.distribution, "internal");
assert.equal(eas.build.preview.android.buildType, "apk");
assert.equal(eas.build.production.distribution, "store");
assert.equal(contract.otaUpdates.enabled, false);
assert.equal(Object.hasOwn(app, "updates"), false);
assert.equal(Object.hasOwn(app, "runtimeVersion"), false);

process.stdout.write(`${JSON.stringify({
  status: "PASS",
  appVersion: contract.marketingVersion,
  buildVersionSource: contract.buildNumbers.source,
  profiles: Object.keys(contract.profiles),
  otaUpdates: "disabled",
})}\n`);
