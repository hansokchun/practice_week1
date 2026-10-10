# Lessons Learned

## 2026-10-11

- Kakao's desktop share SDK posts a form to `sharer.kakao.com`. Loading the SDK is not enough: CSP must permit that exact form destination and its account-login redirect. Keep other form destinations blocked and verify the deployed popup, not just the click handler.
- Prepare sharing SDKs before enabling their buttons. Call the share API directly from the user click and remove failed script elements before retrying; otherwise a completed error event can leave later attempts waiting forever.

## 2026-05-15

- Some Korean text appears broken in PowerShell output even when JSON parses correctly. Verify with Node or UTF-8-aware tools before assuming file corruption.
- Profile nickname writes and profile nickname reads must be designed together. Saving to `profiles` is not enough if public UI never reads that table.
- Fixed Back buttons can feel wrong in a multi-panel SPA. A small sidebar history stack is a better fit than hard-coded return destinations.
- Roll back behavior changes that are not verified in the real UI flow, even if pure helper tests pass. Sidebar Back needs a separate focused pass.
- For copy-to-map workflows, copy plain `lat,lng` rather than a decorated string. It is the smallest format that Google Maps search accepts directly.
- Nickname save failures can be caused by missing Supabase RLS policies even when the API project is active. Check `profiles` insert/update policies before changing persistence logic.
