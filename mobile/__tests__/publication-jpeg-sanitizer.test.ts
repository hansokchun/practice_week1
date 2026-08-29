import {
  containsPublicationJpegMetadata,
  sanitizePublicationJpegMetadata
} from "../src/publication-jpeg-sanitizer";

function segment(marker: number, payload: readonly number[]): number[] {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...payload];
}

function ascii(value: string): number[] {
  return [...value].map((character) => character.charCodeAt(0));
}

function asciiText(bytes: Uint8Array): string {
  return [...bytes].map((value) => String.fromCharCode(value)).join("");
}

describe("publication JPEG metadata sanitizer", () => {
  it("removes EXIF, GPS, XMP, ICC, IPTC, comments, and trailing bytes", () => {
    const input = Uint8Array.from([
      0xff, 0xd8,
      ...segment(0xe0, [0x4a, 0x46, 0x49, 0x46]),
      ...segment(0xe1, ascii("Exif GPS XMP")),
      ...segment(0xe2, ascii("ICC_PROFILE")),
      ...segment(0xed, ascii("IPTC author")),
      ...segment(0xfe, ascii("private comment")),
      ...segment(0xdb, [0x00, 0x01]),
      ...segment(0xda, [0x00, 0x01]),
      0x11, 0xff, 0x00, 0x22, 0xff, 0xd0, 0x33,
      0xff, 0xd9,
      ...ascii("trailing private data")
    ]);

    expect(containsPublicationJpegMetadata(input)).toBe(true);
    const output = sanitizePublicationJpegMetadata(input);
    const serialized = asciiText(output);

    expect(containsPublicationJpegMetadata(output)).toBe(false);
    expect(serialized).not.toMatch(/Exif|GPS|XMP|ICC_PROFILE|IPTC|private|trailing/);
    expect(output.slice(0, 2)).toEqual(Uint8Array.from([0xff, 0xd8]));
    expect(output.slice(-2)).toEqual(Uint8Array.from([0xff, 0xd9]));
    expect([...output]).toEqual(expect.arrayContaining([0xff, 0xdb, 0xff, 0xda, 0xff, 0x00, 0xff, 0xd0]));
  });

  it("removes metadata segments between progressive scan sections", () => {
    const input = Uint8Array.from([
      0xff, 0xd8,
      ...segment(0xda, [0x00]),
      0x11,
      ...segment(0xe1, ascii("Exif between scans")),
      ...segment(0xda, [0x01]),
      0x22,
      0xff, 0xd9
    ]);

    const output = sanitizePublicationJpegMetadata(input);

    expect(containsPublicationJpegMetadata(output)).toBe(false);
    expect(asciiText(output)).not.toContain("Exif between scans");
  });

  it("rejects truncated or non-JPEG data instead of accepting an unsafe derivative", () => {
    expect(() => sanitizePublicationJpegMetadata(Uint8Array.from([1, 2, 3]))).toThrow("JPEG");
    expect(() => sanitizePublicationJpegMetadata(Uint8Array.from([
      0xff, 0xd8,
      0xff, 0xe1, 0x00, 0x20, 0x01,
      0xff, 0xd9
    ]))).toThrow("JPEG");
  });
});
