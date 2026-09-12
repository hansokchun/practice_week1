# Ikkyee Brand Master v1.0

This is the fixed production symbol requested on 2026-09-12. Do not regenerate,
redraw, recolor, crop, or replace it during unrelated design work. An explicit
user request is required for a new brand version.

## Master

- Source: `ikkyee-symbol-v1.png`, 1254 x 1254, transparent RGBA PNG.
- Identity: one outlined location pin, one leaf, a short dotted travel trail.
- Brand color target: dark teal `#245457`; the approved raster is authoritative.
- Keep the original aspect ratio and transparent padding. No stretching, glow,
  shadow, circular clipping, or added background rectangle.
- Wordmark: existing `Ikkyee` Cormorant Garamond and Korean `이끼` remain unchanged.
- White silhouette is allowed on the photographic landing header for contrast.
- Default profile avatars and map markers are separate assets, not this logo.

## Delivery Files

| Use | File | Size |
| --- | --- | --- |
| Website header and favicon | `images/logo.png` | 256 x 256 |
| App splash and header | `mobile/assets/brand-logo.png` | 1024 x 1024 |
| App web favicon | `mobile/assets/favicon.png` | 512 x 512 |
| Android adaptive foreground | `mobile/assets/app-icon-foreground.png` | 1024 x 1024 |
| App store icon, opaque warm white | `mobile/assets/app-icon.png` | 1024 x 1024 |

Paths above are relative to the repository root. Android foreground has 112px
additional padding per edge to keep artwork within adaptive icon masks.
Native icon/splash changes require a new native build; deploying the website
does not update an already installed app binary.

## Reproduction and Checks

`scripts/export-brand-assets.mjs` makes delivery files only from this master.
Run it with Node and Sharp available, or set `SHARP_MODULE_PATH` to an installed
Sharp package directory. No AI generation is needed for size variants.
The generated `manifest.json` fingerprints the master and every output.
`test/brand-assets.test.mjs` rejects unrecorded logo changes and verifies sizes
and alpha channels. Update the version, master, documentation and fingerprints
together only when the user authorizes a new logo.

## Creation Record

Created with the built-in image generation editor from the previous
`images/logo.png`, followed by mechanical PNG resizing/export using Sharp.
Prompt: preserve the existing leaf, outlined location pin and dotted trail;
refine smooth contours and consistent stroke weight; show the entire trail;
use dark teal on a genuinely transparent background without texture, shadows,
text, extra symbols or a presentation mockup. A second edit removed the
generated checkerboard backdrop and produced the final RGBA master.
