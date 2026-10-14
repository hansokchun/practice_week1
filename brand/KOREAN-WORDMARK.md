# Korean Phrase Wordmark v1.0

This separate logo combines the approved leaf/location/trail symbol with the
single-line Korean phrase `장소아카이브 이끼`. There is no Latin wordmark or
divider. The fixed master, runtime logo, earlier archive-caption variant and
animation remain unchanged. Preview at `/brand/#korean-wordmark`.

The 1800 x 440 PNG exports use the source symbol at its original aspect ratio
and NanumGothic Bold outlines. Teal and white transparent files plus light/dark
previews are available individually or in `ikkyee-korean-wordmark.zip`.

## Placement Variants

The later request adds a close left-symbol version and a right-symbol version
at `/brand/#korean-wordmark-layouts`. Both retain the original source pixels,
1800 x 440 canvas, lettering size and symbol orientation. The visible artwork
gap is 24px. The original variant and its ZIP remain unchanged.

Rebuild with `node scripts/export-brand-wordmark-layouts.mjs` using Sharp and
JSZip. Font rendering is not repeated: the exporter repositions the original
RGBA layers and checks their content fingerprints before writing files.
Download all eight PNGs at `korean-wordmark-layouts/ikkyee-wordmark-layouts.zip`.

Run `node scripts/export-brand-korean-wordmark.mjs` with Sharp, fontkit and
JSZip, or set `SHARP_MODULE_PATH`, `FONTKIT_MODULE_PATH` and `JSZIP_MODULE_PATH`.
These are asset-authoring tools, not website dependencies. The shared
`scripts/brand-lettering.mjs` also renders the earlier archive-caption variant;
re-exporting that variant must retain its exact existing asset fingerprints.

Run focused brand tests, then `npm test` and `npm run build` before publishing.
