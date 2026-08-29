const JPEG_MARKER_PREFIX = 0xff;
const START_OF_IMAGE = 0xd8;
const END_OF_IMAGE = 0xd9;
const START_OF_SCAN = 0xda;
const COMMENT = 0xfe;

type JpegTransformResult = {
  readonly bytes: Uint8Array;
  readonly metadataFound: boolean;
};

function isApplicationMetadataMarker(marker: number): boolean {
  return marker >= 0xe0 && marker <= 0xef;
}

function isStandaloneMarker(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
}

function concatenate(chunks: readonly Uint8Array[], totalLength: number): Uint8Array {
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function transformJpeg(bytes: Uint8Array, stripMetadata: boolean): JpegTransformResult {
  if (bytes.length < 4 || bytes[0] !== JPEG_MARKER_PREFIX || bytes[1] !== START_OF_IMAGE) {
    throw new TypeError("A valid JPEG file is required");
  }

  const chunks: Uint8Array[] = [bytes.subarray(0, 2)];
  let outputLength = 2;
  let offset = 2;
  let metadataFound = false;
  let sawScan = false;
  let sawEnd = false;

  const append = (start: number, end: number) => {
    const chunk = bytes.subarray(start, end);
    chunks.push(chunk);
    outputLength += chunk.length;
  };

  while (offset < bytes.length) {
    if (bytes[offset] !== JPEG_MARKER_PREFIX) throw new TypeError("Malformed JPEG marker stream");
    const markerStart = offset;
    let markerIndex = markerStart + 1;
    while (markerIndex < bytes.length && bytes[markerIndex] === JPEG_MARKER_PREFIX) markerIndex += 1;
    if (markerIndex >= bytes.length) throw new TypeError("Truncated JPEG marker");
    const marker = bytes[markerIndex];
    if (marker === undefined) throw new TypeError("Truncated JPEG marker");
    const markerEnd = markerIndex + 1;

    if (marker === END_OF_IMAGE) {
      append(markerStart, markerEnd);
      sawEnd = true;
      break;
    }
    if (marker === 0x00 || marker === START_OF_IMAGE) throw new TypeError("Malformed JPEG marker");
    if (isStandaloneMarker(marker)) {
      append(markerStart, markerEnd);
      offset = markerEnd;
      continue;
    }
    if (markerEnd + 2 > bytes.length) throw new TypeError("Truncated JPEG segment length");
    const lengthHigh = bytes[markerEnd];
    const lengthLow = bytes[markerEnd + 1];
    if (lengthHigh === undefined || lengthLow === undefined) {
      throw new TypeError("Truncated JPEG segment length");
    }
    const segmentLength = (lengthHigh << 8) | lengthLow;
    if (segmentLength < 2) throw new TypeError("Invalid JPEG segment length");
    const segmentEnd = markerEnd + segmentLength;
    if (segmentEnd > bytes.length) throw new TypeError("Truncated JPEG segment");

    const metadataSegment = isApplicationMetadataMarker(marker) || marker === COMMENT;
    metadataFound ||= metadataSegment;
    if (!stripMetadata || !metadataSegment) append(markerStart, segmentEnd);
    offset = segmentEnd;

    if (marker !== START_OF_SCAN) continue;
    sawScan = true;
    const scanStart = offset;
    let scanOffset = offset;
    let nextMarkerFound = false;
    while (scanOffset < bytes.length) {
      if (bytes[scanOffset] !== JPEG_MARKER_PREFIX) {
        scanOffset += 1;
        continue;
      }
      let codeIndex = scanOffset + 1;
      while (codeIndex < bytes.length && bytes[codeIndex] === JPEG_MARKER_PREFIX) codeIndex += 1;
      if (codeIndex >= bytes.length) throw new TypeError("Truncated JPEG scan");
      const code = bytes[codeIndex];
      if (code === undefined) throw new TypeError("Truncated JPEG scan");
      if (code === 0x00 || (code >= 0xd0 && code <= 0xd7)) {
        scanOffset = codeIndex + 1;
        continue;
      }
      append(scanStart, scanOffset);
      offset = scanOffset;
      nextMarkerFound = true;
      break;
    }
    if (!nextMarkerFound) throw new TypeError("JPEG scan has no end marker");
  }

  if (!sawScan || !sawEnd) throw new TypeError("Incomplete JPEG image");
  return { bytes: concatenate(chunks, outputLength), metadataFound };
}

export function containsPublicationJpegMetadata(bytes: Uint8Array): boolean {
  return transformJpeg(bytes, false).metadataFound;
}

export function sanitizePublicationJpegMetadata(bytes: Uint8Array): Uint8Array {
  const sanitized = transformJpeg(bytes, true).bytes;
  if (transformJpeg(sanitized, false).metadataFound) {
    throw new TypeError("JPEG metadata removal could not be verified");
  }
  return sanitized;
}
