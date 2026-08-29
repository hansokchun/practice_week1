import ts from "typescript";
import { mobileColors } from "../src/mobile-theme";

declare const __dirname: string;
declare function require(id: string): unknown;

type DirectoryEntry = {
  readonly name: string;
  isDirectory(): boolean;
  isFile(): boolean;
};

const fs = require("node:fs") as {
  readFileSync(file: string, encoding: "utf8"): string;
  readdirSync(directory: string, options: { readonly withFileTypes: true }): DirectoryEntry[];
};
const path = require("node:path") as {
  join(...parts: string[]): string;
  relative(from: string, to: string): string;
  resolve(...parts: string[]): string;
};

function listTsxFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return listTsxFiles(absolute);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [absolute] : [];
  });
}

describe("mobile accessibility source contract", () => {
  it("gives every Pressable an explicit accessibility role", () => {
    const roots = [path.resolve(__dirname, "../app"), path.resolve(__dirname, "../src")];
    const missing: string[] = [];
    for (const file of roots.flatMap(listTsxFiles)) {
      const source = fs.readFileSync(file, "utf8");
      const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function visit(node: ts.Node) {
        if (ts.isJsxOpeningElement(node) && node.tagName.getText(tree) === "Pressable") {
          const hasRole = node.attributes.properties.some((property) =>
            ts.isJsxAttribute(property) && property.name.getText(tree) === "accessibilityRole"
          );
          if (!hasRole) {
            const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
            missing.push(`${path.relative(path.resolve(__dirname, ".."), file)}:${line}`);
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(tree);
    }
    expect(missing).toEqual([]);
  });

  it("keeps known compact icon and map controls at least 44 points square", () => {
    const tabLayout = fs.readFileSync(path.resolve(__dirname, "../app/(tabs)/_layout.tsx"), "utf8");
    const privateMap = fs.readFileSync(path.resolve(__dirname, "../src/private-photo-map.tsx"), "utf8");
    const profile = fs.readFileSync(path.resolve(__dirname, "../app/profile.tsx"), "utf8");
    expect(tabLayout).toMatch(/profileButton:\s*\{[^}]*height:\s*44[^}]*width:\s*44/su);
    expect(privateMap).toMatch(/marker:\s*\{[^}]*height:\s*44[^}]*width:\s*44/su);
    expect(profile).toMatch(/closeButton:\s*\{[^}]*minHeight:\s*44[^}]*minWidth:\s*44/su);
  });

  it("keeps core normal-text color pairs at WCAG AA contrast", () => {
    function luminance(hex: string) {
      const normalized = hex.replace(/^#/u, "");
      const channels = normalized.match(/.{2}/gu)?.map((value) => Number.parseInt(value, 16) / 255) ?? [];
      const linear = channels.map((value) => value <= 0.03928
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4);
      return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
    }
    function ratio(foreground: string, background: string) {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
    }
    const pairs = [
      [mobileColors.ink, mobileColors.paper],
      [mobileColors.muted, mobileColors.paper],
      [mobileColors.pine, mobileColors.paper],
      [mobileColors.pineDeep, mobileColors.surface],
      ["#9b2c2c", mobileColors.paper],
      [mobileColors.ink, "#f48c71"],
      [mobileColors.ink, mobileColors.gold]
    ] as const;
    for (const [foreground, background] of pairs) expect(ratio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
