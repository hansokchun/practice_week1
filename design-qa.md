# Main map capsule QA

- Date: 2026-09-12
- Source: `/Users/hansokchun/.codex/generated_images/019e5ff8-8c85-73f3-9a35-7758946be066/exec-5153e628-733b-42f0-a0ca-d396a05ac3f5.png`
- Implementation: `/tmp/ikkyee-capsule-desktop.png`, `/tmp/ikkyee-capsule-mobile.png`
- Preview: http://127.0.0.1:8089/#/
- Fixture comparison: http://127.0.0.1:8088/#/
- Scope: map button only; the surrounding gallery is unchanged.

## Comparison

The source is an enlarged component concept (1448 x 1086 pixels), not a
literal full-page layout. Its capsule silhouette, real map photograph,
white map icon/text/arrow, light rim and subtle shadow were compared in the
same image-review input with the rendered desktop and mobile captures.
No claim of whole-page pixel matching is made.

Implementation screenshots are 1280 x 720 and 390 x 844 at one pixel per CSS
pixel. The component uses the agreed practical dimensions: 360 x 64 CSS px
desktop and 280 x 56 CSS px mobile, centered 20px above the safe area.
The darker scrim keeps small white type legible over the same map photo.

## Checks

- Desktop screenshot: capsule silhouette, photograph and centered contents pass.
- Mobile screenshot: 390px layout, no horizontal page overflow, contents fit.
- 320px layout: map icon, label and arrow all remain inside the button bounds.
- Scroll by 2160px: button stays at y=636 in a 720px viewport (20px bottom gap).
- Click: opens Explore; capsule disappears outside Home.
- Photo detail and login dialogs: capsule hidden; closing restores it.
- Intro landing: capsule hidden.
- Footer has extra bottom space; reduced-motion styles disable transitions.
- 776 tests pass; production build passes.

## Findings And Limits

No actionable P0/P1/P2 differences for this component. Initial mobile capture
was taken before the browser finished resizing and was discarded; the accepted
mobile capture was taken after layout stabilized. The map photograph crop is
adapted to the smaller production button, not stretched from the concept.

Production photo data remains blocked by the previously verified Supabase
quota restriction. Gallery interaction tests use local fixtures; this change
does not resolve that server restriction. Physical-device safe-area behavior
was not tested; CSS uses the browser safe-area inset.

final result: passed
