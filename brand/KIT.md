# Ikkyee Delivery Kit v1.0

Created on 2026-10-14 for app, website and marketing use. The approved symbol
and existing web/native runtime assets remain unchanged. The separate package
contains 24 PNG exports, a preview sheet, Korean usage guide and original
open-source fonts with licenses.

- Preview and individual downloads: `/brand/` on the deployed website.
- Archive: `public/brand/ikkyee-brand-kit-v1.zip`.
- Export fingerprints and source font hashes: `public/brand/manifest.json`.
- Korean guide and future use-case checklist: `public/brand/사용안내.txt`.

## Rebuild and Verify

Run `node scripts/export-brand-kit.mjs` with `sharp`, `fontkit` and `jszip`
available. As with the existing brand exporter, external/bundled tools can be
resolved using `SHARP_MODULE_PATH`, `FONTKIT_MODULE_PATH` and `JSZIP_MODULE_PATH`.
These are authoring tools, not frontend dependencies. Exported files are checked
into the repository; normal production builds do not need those packages.

The wordmark is rendered directly from Cormorant Garamond at weight 700 and
NanumGothic Bold glyph outlines. This prevents system font fallback. Font files
are unmodified downloads from the official Google Fonts repository and include
their SIL Open Font Licenses. PNG lettering does not require fonts on a viewer's
device. The white symbol reuses the master's exact alpha mask.

Run the focused tests to check both delivery hashes and the unchanged approved
native/web release:

```bash
node --test test/brand-kit.test.mjs test/brand-assets.test.mjs test/native-brand-assets.test.mjs
```

Run `npm test` and `npm run build` before publishing.

## Export Rules

- Never regenerate, trace, crop or stretch `brand/ikkyee-symbol-v1.png`.
- Preserve the full master padding. Use dark teal on light backgrounds and the
  existing contrast treatment (white alpha silhouette) on dark backgrounds.
- The App Store file is an exact copy of the approved opaque 1024px icon. Android
  adaptive foreground is an exact copy of its approved padded 1024px export.
- Google Play delivery is a 512px, sRGB, 32-bit PNG with fully opaque pixels.
- Do not bake rounded corners, shadows or circular masks into store assets.
- This kit does not change the application's launcher icon, favicon, splash or
  photo/album sharing previews. Native asset changes require a new native build.
- The kit's SVG glyph renderer is only an internal rendering step. Deliveries
  are PNG, not a claimed infinitely scalable vector master or a CMYK print file.
- The downloadable kit is loaded only on its standalone page or download; the
  archive and fonts are not imported by the app or normal service pages.

## Official Sources

- [Apple app icons](https://developer.apple.com/design/human-interface-guidelines/app-icons/)
- [Google Play icon specifications](https://developer.android.com/distribute/google-play/resources/icon-design-specifications)
- [Google Play preview assets](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Cormorant Garamond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond)
- [NanumGothic](https://github.com/google/fonts/tree/main/ofl/nanumgothic)
