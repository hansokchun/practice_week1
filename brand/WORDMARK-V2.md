# Korean Wordmark v2.1

This is the current reusable Korean wordmark kit for `이끼 · 장소 저장소`.
It improves type hierarchy, symbol placement and small-size legibility without
redrawing or replacing the approved raster symbol. The existing app UI, app
icons, runtime logos, earlier wordmark kits and Shorts assets remain unchanged.
Assets live in [`public/brand/wordmark-v2/`](../public/brand/wordmark-v2/).

## Identity and Typography

- `이끼` is the primary brand name and uses Pretendard SemiBold 600.
- `장소 저장소` is the smaller service descriptor and uses Pretendard Medium
  500. It must remain subordinate to `이끼`, not read as a second brand name.
- The approved symbol keeps its original raster pixels, aspect ratio,
  transparent alpha and safety padding. Do not trace, crop, stretch, recolor or
  optically redraw it.
- Teal exports retain the approved brand color treatment. White exports are for
  sufficient-contrast dark or photographic backgrounds.
- Font sources are [Pretendard Medium 500](fonts/Pretendard-Medium.otf) and
  [Pretendard SemiBold 600](fonts/Pretendard-SemiBold.otf), taken from official
  source commit `7aeb0698819be2b4097dae8ec8fe6a795e5cf3ae`.
  Redistribution terms are included in
  [Pretendard-LICENSE.txt](fonts/Pretendard-LICENSE.txt).

## Layouts

| Variant | Composition | Base canvas | Minimum display width | Use |
| --- | --- | ---: | ---: | --- |
| Horizontal | Symbol on the left; small `장소 저장소` above large `이끼` | 1024 x 400 | 280px | Headers, partner pages, horizontal marketing placements |
| Stacked | Symbol above `이끼`, then smaller `장소 저장소` | 640 x 720 | 180px | Square or narrow placements, posters and centered brand panels |
| Compact | Symbol plus `이끼`; service descriptor omitted | 560 x 220 | 104px | Small watermarks, profile-adjacent marks and constrained UI surfaces |

Use the horizontal layout by default when width permits. Choose stacked where
the horizontal lockup would become cramped, and choose compact below the
descriptor's readable size. Minimum widths apply to the complete canvas,
including its preserved transparent safety area.

## Deliveries

Each layout is supplied in teal and white as transparent 1x PNG, transparent 2x
PNG and SVG. The SVG lettering is converted to outlines, while the approved
symbol remains the original PNG embedded in the SVG. These files are portable
mixed raster/vector artwork and must not be described as pure vector logos.

| Layout | Teal files | White files |
| --- | --- | --- |
| Horizontal | [1x PNG](../public/brand/wordmark-v2/horizontal-teal.png) · [2x PNG](../public/brand/wordmark-v2/horizontal-teal@2x.png) · [SVG](../public/brand/wordmark-v2/horizontal-teal.svg) | [1x PNG](../public/brand/wordmark-v2/horizontal-white.png) · [2x PNG](../public/brand/wordmark-v2/horizontal-white@2x.png) · [SVG](../public/brand/wordmark-v2/horizontal-white.svg) |
| Stacked | [1x PNG](../public/brand/wordmark-v2/stacked-teal.png) · [2x PNG](../public/brand/wordmark-v2/stacked-teal@2x.png) · [SVG](../public/brand/wordmark-v2/stacked-teal.svg) | [1x PNG](../public/brand/wordmark-v2/stacked-white.png) · [2x PNG](../public/brand/wordmark-v2/stacked-white@2x.png) · [SVG](../public/brand/wordmark-v2/stacked-white.svg) |
| Compact | [1x PNG](../public/brand/wordmark-v2/compact-teal.png) · [2x PNG](../public/brand/wordmark-v2/compact-teal@2x.png) · [SVG](../public/brand/wordmark-v2/compact-teal.svg) | [1x PNG](../public/brand/wordmark-v2/compact-white.png) · [2x PNG](../public/brand/wordmark-v2/compact-white@2x.png) · [SVG](../public/brand/wordmark-v2/compact-white.svg) |

- Complete archive: [ikkyee-wordmark-v2.zip](../public/brand/wordmark-v2/ikkyee-wordmark-v2.zip)
- Light-background overview: [preview.png](../public/brand/wordmark-v2/preview.png)
- Dark-background overview: [preview-dark.png](../public/brand/wordmark-v2/preview-dark.png)
- Minimum-size comparison: [size-check.png](../public/brand/wordmark-v2/size-check.png)
- Distribution guide: [guide.txt](../public/brand/wordmark-v2/guide.txt)
- File dimensions and fingerprints: [manifest.json](../public/brand/wordmark-v2/manifest.json)

The ZIP includes the font license alongside the generated artwork and usage
guide. PNGs are the reference rendering for ordinary use; SVGs are provided for
scalable placement where an embedded raster symbol is acceptable.

## Usage Rules

- Scale the complete lockup proportionally. Do not move the symbol, change the
  type hierarchy, tighten the internal gaps or remove transparent padding.
- Do not use the horizontal layout below 280px or the stacked layout below
  180px. Use compact at small sizes, never a squeezed descriptor.
- On photographs, select teal or white from actual background contrast and
  inspect the final export at posting size. Do not add a shadow, glow, outline
  or unapproved backing shape to rescue insufficient contrast.
- A watermark must remain legible without dominating the image. Keep it clear
  of platform controls, captions and important photographic content.
- This kit is a standalone brand export. Creating or publishing it does not
  automatically replace website UI, native-app assets, previous kits or Shorts
  compositions.

## Rebuild and Review

The exporter must load the committed Pretendard files above, preserve the
approved symbol's pixels and alpha, and write deterministic dimensions and
fingerprints to the manifest. Review the light, dark and minimum-size previews
before distribution. Publishing the downloadable kit is separate from a main
website or native-app release.
