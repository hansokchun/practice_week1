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
  it("allows the shared album tables through one read-only repository only", () => {
    const violations: string[] = [];

    for (const path of sourceRoots.flatMap(sourceFiles)) {
      const source = readFileSync(path, "utf8");
      if (/\.from\(\s*["'](?:albums|album_photos)["']\s*\)/u.test(source) &&
          relative(mobileRoot, path) !== "src/album-repository.ts") violations.push(relative(mobileRoot, path));
    }

    expect(violations).toEqual([]);
    const repository = readFileSync(join(mobileRoot, "src/album-repository.ts"), "utf8");
    expect(repository).toMatch(/\.from\("albums"\)\.select/u);
    expect(repository).toMatch(/\.from\("album_photos"\)[\s\S]{0,80}\.select/u);
    expect(repository).not.toMatch(/\.(?:insert|update|delete|upsert|rpc)\(/u);
    expect(contract.mobileRepositories.some((entry) => /album/iu.test(`${entry.name}:${entry.table}`))).toBe(false);
    expect(contract.mobileReadOnlyTables).toEqual(["albums", "album_photos"]);
    expect(contract.mobileReadOnlyRepositories.every((entry) =>
      entry.queries.join(",") === "select" && entry.mutations.length === 0
    )).toBe(true);
    expect(contract.webOnlyTables).toEqual([]);
  });
});
