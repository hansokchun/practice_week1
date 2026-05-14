# Lessons Learned

## 2026-05-15

- Some Korean text appears broken in PowerShell output even when JSON parses correctly. Verify with Node or UTF-8-aware tools before assuming file corruption.
- Profile nickname writes and profile nickname reads must be designed together. Saving to `profiles` is not enough if public UI never reads that table.
- Fixed Back buttons can feel wrong in a multi-panel SPA. A small sidebar history stack is a better fit than hard-coded return destinations.
- Roll back behavior changes that are not verified in the real UI flow, even if pure helper tests pass. Sidebar Back needs a separate focused pass.
- For copy-to-map workflows, copy plain `lat,lng` rather than a decorated string. It is the smallest format that Google Maps search accepts directly.
- Nickname save failures can be caused by missing Supabase RLS policies even when the API project is active. Check `profiles` insert/update policies before changing persistence logic.
