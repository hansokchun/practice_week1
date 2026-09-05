import { resolvePostAuthRoute } from "../src/post-auth-route";

describe("post-auth route", () => {
  it("returns to a safe photo detail after login", () => {
    expect(resolvePostAuthRoute("/explore-photo/photo-a")).toBe("/explore-photo/photo-a");
  });

  it.each([
    "https://attacker.example/photo",
    "//attacker.example/photo",
    "/auth/login",
    "/explore-photo/../profile",
    ["/explore-photo/photo-a", "/profile"]
  ])("falls back to profile for an unsafe destination", (value) => {
    expect(resolvePostAuthRoute(value)).toBe("/profile");
  });
});
