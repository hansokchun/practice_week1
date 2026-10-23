# Archive Logo Shorts Kit v1.0

The separate 9:16 editing kit uses `장소아카이브 이끼`, the approved symbol,
NanumGothic Bold and the existing close-left/right wordmark PNGs. No generative
video model or logo redraw is used. Original logos, animation and app assets are
unchanged. Preview at `/brand/#shorts-kit`; assets live in `public/brand/shorts/`.

## Deliveries

- Two 3-second intros and two 4-second outros: H.264 MP4, 1080 x 1920, 30fps.
- Two 3-second lower-third overlays: teal/white ProRes 4444 MOV with real alpha.
- Sixteen PNGs: intro/outro cards, positioned portrait overlays, adjustable
  watermarks and a stacked symbol/Korean-wordmark composition.
- Three small GIF previews, a comparison sheet, guide, manifest and three ZIPs.
- Silent exports. MP4s include backgrounds; only MOV/marked PNGs are transparent.

The intro reveals the existing six dots, then the complete pin/leaf and Korean
lettering. After 1.8 seconds the exact source lockup is used for the hold. The
outro adds existing service copy and the site URL. The overlay settles in,
holds and fades to fully transparent before its final frame. No artwork is
mirrored, stretched, traced or cropped.

Portrait placement leaves margins as a starting point, not a universal platform
safe-area guarantee. Check the chosen app UI, device and captions before posting.
MOV compatibility depends on editor support; transparent PNGs plus editor fades
are the fallback. Individual archives stay below the 25 MiB hosting limit.

## Rebuild and QA

Run `node scripts/export-brand-shorts.mjs` with Sharp, fontkit, JSZip, FFmpeg and
FFprobe. Paths can be supplied with `SHARP_MODULE_PATH`, `FONTKIT_MODULE_PATH`,
`JSZIP_MODULE_PATH`, `FFMPEG_PATH` and `FFPROBE_PATH`. These are authoring tools,
not website or native-app dependencies. Temporary frame sequences are removed.

The exporter checks source SHA-256 fingerprints, probes and decodes the encoded
streams, and samples actual MOV alpha at the first, hold and last frames.
Tests enforce portrait framing, durations, frame counts, alpha coverage, file
budgets, preserved sources and standalone non-autoplay delivery.

Run `npm test` and `npm run build`. Native builds exclude `/brand` downloads,
so video/ZIP packages do not become app-binary payload or normal-page requests.

## Map-to-feed endings (2026-10-23)

The separately requested final 3-second V3 and 4-second V4 endings show a map
pin becoming a photo, joining an actual mobile main-page capture, scrolling,
and finishing on the approved wordmark. Their portable renderers, shared source
images, encoder, delivery fingerprints and verification records live in
[`marketing/shorts-map-feed/`](../marketing/shorts-map-feed/README.md).
These 60fps marketing deliveries do not replace the original kit above and are
not added to normal website or app downloads.
