import {
  buildMobilePhotoShareUrl,
  encodePublicationShareToken,
  extractMobilePhotoShareToken,
  isPublicationShareToken
} from "../src/publication-link-token";

describe("publication link token", () => {
  it("encodes exactly 256 random bits as lowercase hex", () => {
    const bytes = Uint8Array.from({ length: 32 }, (_, index) => index);
    const token = encodePublicationShareToken(bytes);
    expect(token).toHaveLength(64);
    expect(token).toBe("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
    expect(isPublicationShareToken(token)).toBe(true);
  });

  it("rejects short, non-hex, and uppercase token forms", () => {
    expect(() => encodePublicationShareToken(new Uint8Array(31))).toThrow("256-bit");
    expect(isPublicationShareToken("a".repeat(63))).toBe(false);
    expect(isPublicationShareToken("g".repeat(64))).toBe(false);
    expect(isPublicationShareToken("A".repeat(64))).toBe(false);
  });

  it("builds an HTTPS universal link for release and keeps the custom scheme fallback for development", () => {
    const token = "a".repeat(64);

    expect(buildMobilePhotoShareUrl(token)).toBe(`ikkyee://photo-link/${token}`);
    expect(buildMobilePhotoShareUrl(token, "https://practice-week1-cws.pages.dev")).toBe(
      `https://practice-week1-cws.pages.dev/photo-link#${token}`
    );
    expect(() => buildMobilePhotoShareUrl("unsafe")).toThrow("share token");
    expect(() => buildMobilePhotoShareUrl(token, "http://practice-week1-cws.pages.dev")).toThrow("HTTPS origin");
    expect(() => buildMobilePhotoShareUrl(token, "https://practice-week1-cws.pages.dev/path")).toThrow("HTTPS origin");
  });

  it("extracts tokens only from the registered custom scheme or matching HTTPS fragment", () => {
    const token = "b".repeat(64);
    const origin = "https://practice-week1-cws.pages.dev";

    expect(extractMobilePhotoShareToken(`ikkyee://photo-link/${token}`, origin)).toBe(token);
    expect(extractMobilePhotoShareToken(`${origin}/photo-link#${token}`, origin)).toBe(token);
    expect(extractMobilePhotoShareToken(`${origin}/photo-link?token=${token}`, origin)).toBeNull();
    expect(extractMobilePhotoShareToken(`https://attacker.example/photo-link#${token}`, origin)).toBeNull();
    expect(extractMobilePhotoShareToken(`${origin}/photo-link#unsafe`, origin)).toBeNull();
  });
});
