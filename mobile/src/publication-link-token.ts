export const PUBLICATION_SHARE_TOKEN_BYTES = 32;

export function encodePublicationShareToken(bytes: Uint8Array): string {
  if (bytes.byteLength !== PUBLICATION_SHARE_TOKEN_BYTES) {
    throw new TypeError("A 256-bit publication share token is required");
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isPublicationShareToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function normalizePublicLinkOrigin(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new TypeError("A valid HTTPS origin is required");
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "" ||
      url.pathname !== "/" || url.search !== "" || url.hash !== "") {
      throw new TypeError("A valid HTTPS origin is required");
    }
    return url.origin;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("HTTPS origin")) throw error;
    throw new TypeError("A valid HTTPS origin is required");
  }
}

export function buildMobilePhotoShareUrl(token: string, publicOrigin: unknown = null): string {
  if (!isPublicationShareToken(token)) throw new TypeError("A valid publication share token is required");
  const origin = normalizePublicLinkOrigin(publicOrigin);
  return origin === null ? `ikkyee://photo-link/${token}` : `${origin}/photo-link#${token}`;
}

export function extractMobilePhotoShareToken(value: unknown, publicOrigin: unknown = null): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol === "ikkyee:" && url.hostname === "photo-link" &&
      url.search === "" && url.hash === "") {
      const token = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
      return isPublicationShareToken(token) ? token : null;
    }
    const origin = normalizePublicLinkOrigin(publicOrigin);
    if (origin !== null && url.origin === origin && url.pathname === "/photo-link" &&
      url.search === "" && url.hash.startsWith("#")) {
      const token = url.hash.slice(1);
      return isPublicationShareToken(token) ? token : null;
    }
    return null;
  } catch {
    return null;
  }
}
