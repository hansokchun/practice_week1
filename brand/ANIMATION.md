# Ikkyee Logo Motion v1.0

Created on 2026-10-15 as a silent, three-second full-HD logo reveal. The approved
symbol and existing Cormorant/NanumGothic wordmark PNGs are unchanged. No paid
generative video model, logo redraw, new font or native app build is involved.

## Deliveries

Preview on `/brand/#logo-animation`; files live under `public/brand/animation/`.

- Light and dark H.264 MP4s: 1920 x 1080, 30 fps, 90 frames, background included.
- Teal and white ProRes 4444 MOVs: same motion with an alpha channel for overlay.
- `preview.gif`: small looping preview, not the editing master.
- PNG posters and a six-frame verification sheet.
- ZIP package and source/output SHA-256 manifest.

The animation is not loaded by ordinary service pages. The standalone brand page
uses user-controlled video playback with `preload="none"`, not autoplay.
The earlier 24-PNG static kit stays unchanged; animation downloads are separate.

## Motion and Fidelity

- Existing six trail dots appear from the bottom of the trail toward the pin.
- The complete pin/leaf raster fades in with a 12px settling movement.
- The approved wordmark fades in with a 10px settling movement.
- After 1.8 seconds, the exact original horizontal lockup is used for the hold.
- Connected components label existing alpha pixels; masks do not trace or redraw
  the approved artwork. All remaining pixels stay with the main symbol layer.
- Both pin and text preserve their original proportions and full source padding.

## Rebuild

Run `node scripts/export-brand-animation.mjs` with Sharp, JSZip and FFmpeg
available. External authoring tool locations can be supplied with
`SHARP_MODULE_PATH`, `JSZIP_MODULE_PATH` and `FFMPEG_PATH`. Runtime website/app
dependencies remain unchanged. Temporary PNG frame sequences are cleaned up.

```bash
node --test test/brand-motion.test.mjs test/brand-assets.test.mjs test/brand-kit.test.mjs
npm test
npm run build
```

Verify the actual encoded streams, decode first/middle/last frames and check
alpha coverage in the MOVs. A GIF preview cannot establish full-HD quality or
MOV transparency. ProRes support varies by editor; MP4 fallback is provided.
Never describe MP4 as a transparent export or deploy new launcher assets merely
because the web brand page was updated.
