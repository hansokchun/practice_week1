# Archive-Caption Logo v1.0

This separate variant replaces only the Korean caption with `장소아카이브`.
It does not replace the approved brand master, runtime logos, 24-file kit or
existing animation. Preview and download at `/brand/#archive-logo`.

The original 1800 x 600 horizontal lockups supply the first 1390 columns of
unchanged RGBA pixels, containing the complete symbol, Latin wordmark and
divider. The new canvas is 2100 x 600; the additional width accommodates six
Korean characters without stretching or reducing the existing artwork.
The caption uses the approved NanumGothic Bold font outlines at the original
caption size. The exporter checks pixel equality of the preserved region.

Run `node scripts/export-brand-archive-logo.mjs` with Sharp, fontkit and JSZip
available, or set `SHARP_MODULE_PATH`, `FONTKIT_MODULE_PATH` and
`JSZIP_MODULE_PATH`. These tools are only needed for asset authoring.
The downloadable ZIP includes two transparent PNGs, light/dark previews,
usage instructions, font license and source/output fingerprints.

Verify with `node --test test/brand-archive-logo.test.mjs test/brand-kit.test.mjs
test/brand-assets.test.mjs`, then `npm test` and `npm run build` before publishing.
