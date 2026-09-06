import appConfig from "../app.json";
import { getMobileScreenGutter, usesCompactHeaderLayout } from "../src/mobile-layout";

describe("mobile layout policy", () => {
  it("keeps 360px and 390px portrait layouts within their intended gutters", () => {
    expect(getMobileScreenGutter(360)).toBe(12);
    expect(getMobileScreenGutter(390)).toBe(20);
    expect(360 - getMobileScreenGutter(360) * 2).toBeGreaterThanOrEqual(336);
    expect(390 - getMobileScreenGutter(390) * 2).toBeGreaterThanOrEqual(350);
  });

  it("declares the supported release orientation explicitly", () => {
    expect(appConfig.expo.orientation).toBe("portrait");
  });

  it("uses the compact header only on very narrow devices", () => {
    expect(usesCompactHeaderLayout(320)).toBe(true);
    expect(usesCompactHeaderLayout(340)).toBe(true);
    expect(usesCompactHeaderLayout(360)).toBe(false);
  });
});
