import appConfig from "../app.json";
import easConfig from "../eas.json";
import releaseContract from "../release-contract.json";

describe("mobile release identity contract", () => {
  it("pins the public version, native identifiers, and initial build numbers", () => {
    expect(appConfig.expo.version).toBe(releaseContract.marketingVersion);
    expect(appConfig.expo.ios.bundleIdentifier).toBe(releaseContract.identifiers.ios);
    expect(appConfig.expo.ios.buildNumber).toBe(releaseContract.buildNumbers.iosInitial);
    expect(appConfig.expo.android.package).toBe(releaseContract.identifiers.android);
    expect(appConfig.expo.android.versionCode).toBe(releaseContract.buildNumbers.androidInitial);
    expect(easConfig.cli.appVersionSource).toBe(releaseContract.buildNumbers.source);
  });

  it("keeps preview standalone, production store-ready, and OTA disabled", () => {
    expect(easConfig.build.development.developmentClient).toBe(true);
    expect(easConfig.build["development-simulator"].ios.simulator).toBe(true);
    expect(easConfig.build.preview.developmentClient).not.toBe(true);
    expect(easConfig.build.preview.distribution).toBe("internal");
    expect(easConfig.build.preview.android.buildType).toBe("apk");
    expect(easConfig.build.production.distribution).toBe("store");
    expect(easConfig.build.production.autoIncrement).toBe(true);
    expect(releaseContract.otaUpdates.enabled).toBe(false);
    expect(appConfig.expo).not.toHaveProperty("updates");
    expect(appConfig.expo).not.toHaveProperty("runtimeVersion");
  });
});
