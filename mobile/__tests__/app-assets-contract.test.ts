import appConfig from "../app.json";
import packageJson from "../package.json";

declare const __dirname: string;

type PngBytes = {
  readUInt32BE(offset: number): number;
  readUInt8(offset: number): number;
  subarray(start: number, end: number): { toString(encoding: "hex"): string };
};

const { readFileSync } = jest.requireActual<{
  readFileSync(path: string): PngBytes;
}>("node:fs");
const { resolve } = jest.requireActual<{
  resolve(...parts: string[]): string;
}>("node:path");

const mobileRoot = resolve(__dirname, "..");

function readPng(path: string): { readonly width: number; readonly height: number; readonly colorType: number } {
  const bytes = readFileSync(resolve(mobileRoot, path));
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes.readUInt8(25)
  };
}

describe("production app assets", () => {
  it("uses an opaque 1024px store icon and a transparent adaptive foreground", () => {
    expect(appConfig.expo.icon).toBe("./assets/app-icon.png");
    const icon = readPng("assets/app-icon.png");
    expect(icon).toEqual({ width: 1024, height: 1024, colorType: 2 });

    expect(appConfig.expo.android.adaptiveIcon).toEqual({
      backgroundColor: "#F9F7F2",
      foregroundImage: "./assets/app-icon-foreground.png",
      monochromeImage: "./assets/app-icon-foreground.png"
    });
    const foreground = readPng("assets/app-icon-foreground.png");
    expect(foreground).toEqual({ width: 1024, height: 1024, colorType: 6 });
  });

  it("uses the supported splash-screen plugin and branded web favicon", () => {
    expect(packageJson.dependencies["expo-splash-screen"]).toBe("~57.0.8");
    expect(appConfig.expo.plugins).toContainEqual([
      "expo-splash-screen",
      {
        backgroundColor: "#F9F7F2",
        image: "./assets/app-icon-foreground.png",
        imageWidth: 180,
        resizeMode: "contain"
      }
    ]);
    expect(appConfig.expo.web.favicon).toBe("./assets/favicon.png");
    expect(readPng("assets/favicon.png")).toEqual({ width: 512, height: 512, colorType: 6 });
  });
});
