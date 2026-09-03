import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('../mobile/src/device-photo-thumbnail-cache.ts', import.meta.url), 'utf8');

test('mobile device thumbnails use a moderately sharper cached derivative', () => {
  assert.match(source, /THUMBNAIL_LONG_EDGE = 640\b/u);
  assert.match(source, /THUMBNAIL_JPEG_QUALITY = 0\.78\b/u);
  assert.match(source, /THUMBNAIL_CACHE_VERSION = "v2"/u);
  assert.match(source, /digestStringAsync\(CryptoDigestAlgorithm\.SHA256, `\$\{THUMBNAIL_CACHE_VERSION\}:\$\{assetId\}`\)/u);
});
