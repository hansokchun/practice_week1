import contract from "../src/backend-policy-contract.json";

const { readdirSync, readFileSync, statSync } = jest.requireActual<{
  readdirSync(path: string): string[];
  readFileSync(path: string, encoding: string): string;
  statSync(path: string): { isDirectory(): boolean };
}>("node:fs");
const { join, relative } = jest.requireActual<{
  join(...paths: string[]): string;
  relative(from: string, to: string): string;
}>("node:path");

const mobileRoot = process["cwd"]().replace(/[\\/]mobile$/u, "/mobile");
const sourceRoots = [join(mobileRoot, "app"), join(mobileRoot, "src")];
const sourceExtensions = new Set([".ts", ".tsx", ".mjs"]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    const extension = path.slice(path.lastIndexOf("."));
    return sourceExtensions.has(extension) ? [path] : [];
  });
}

describe("mobile album product boundary", () => {
  it("contains no album table query, mutation, RPC, route, or repository", () => {
    const violations: string[] = [];
    const forbidden = [
      /\.from\(\s*["']albums["']\s*\)/u,
      /\.from\(\s*["']album_photos["']\s*\)/u,
      /\b(?:insert\s+into|update|delete\s+from|select\b[\s\S]{0,80}\bfrom)\s+(?:public\.)?albums\b/iu,
      /\b(?:insert\s+into|update|delete\s+from|select\b[\s\S]{0,80}\bfrom)\s+(?:public\.)?album_photos\b/iu,
      /\.rpc\(\s*["'][^"']*album[^"']*["']/iu,
      /pathname\s*:\s*["'][^"']*album[^"']*["']/iu
    ];

    for (const path of sourceRoots.flatMap(sourceFiles)) {
      const source = readFileSync(path, "utf8");
      if (forbidden.some((pattern) => pattern.test(source))) violations.push(relative(mobileRoot, path));
    }

    expect(violations).toEqual([]);
    expect(contract.mobileRepositories.some((entry) => /album/iu.test(`${entry.name}:${entry.table}`))).toBe(false);
    expect(contract.webOnlyTables).toEqual(expect.arrayContaining(["albums", "album_photos"]));
  });
});
