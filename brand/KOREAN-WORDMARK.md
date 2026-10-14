# Korean Phrase Wordmark v1.0

This separate logo combines the approved leaf/location/trail symbol with the
single-line Korean phrase `장소아카이브 이끼`. There is no Latin wordmark or
divider. The fixed master, runtime logo, earlier archive-caption variant and
animation remain unchanged. Preview at `/brand/#korean-wordmark`.

The 1800 x 440 PNG exports use the source symbol at its original aspect ratio
and NanumGothic Bold outlines. Teal and white transparent files plus light/dark
previews are available individually or in `ikkyee-korean-wordmark.zip`.

Run `node scripts/export-brand-korean-wordmark.mjs` with Sharp, fontkit and
JSZip, or set `SHARP_MODULE_PATH`, `FONTKIT_MODULE_PATH` and `JSZIP_MODULE_PATH`.
These are asset-authoring tools, not website dependencies. The shared
`scripts/brand-lettering.mjs` also renders the earlier archive-caption variant;
re-exporting that variant must retain its exact existing asset fingerprints.

Run focused brand tests, then `npm test` and `npm run build` before publishing.
