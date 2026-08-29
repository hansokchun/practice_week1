import eas from "../eas.json";

const { readFileSync } = jest.requireActual<{
  readFileSync(path: string, encoding: string): string;
}>("node:fs");

describe("mobile backend environment profiles", () => {
  it("binds every EAS build profile to the matching named environment", () => {
    for (const name of ["development", "preview", "production"] as const) {
      expect(eas.build[name].environment).toBe(name);
      expect(eas.build[name].env.EXPO_PUBLIC_APP_ENV).toBe(name);
      expect(eas.build[name].channel).toBe(name);
    }
    expect(eas.build.development.developmentClient).toBe(true);
    expect(eas.build.preview.distribution).toBe("internal");
    expect(eas.build.production.autoIncrement).toBe(true);
  });

  it("keeps backend URLs and keys out of committed EAS profiles", () => {
    const serialized = JSON.stringify(eas);
    expect(serialized).not.toMatch(/SUPABASE_URL|SUPABASE_(?:PUBLISHABLE|ANON)_KEY/u);
    expect(serialized).not.toContain("pqczcponriukilrtpbdl");
    expect(serialized).not.toMatch(/service[_-]?role|secret/iu);
  });

  it("documents only a local public client configuration in the env template", () => {
    const mobileRoot = process["cwd"]().replace(/[\\/]mobile$/u, "/mobile");
    const template = readFileSync(`${mobileRoot}/.env.example`, "utf8");
    expect(template).toMatch(/^EXPO_PUBLIC_APP_ENV=development$/mu);
    expect(template).toMatch(/^EXPO_PUBLIC_SUPABASE_URL=http:\/\/127\.0\.0\.1:54321$/mu);
    expect(template).toMatch(/^EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/mu);
    expect(template).not.toMatch(/^(?:EXPO_PUBLIC_)?(?:SUPABASE_)?(?:SERVICE_ROLE|SECRET)[A-Z0-9_]*=/mu);
  });
});
