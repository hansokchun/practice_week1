# Project Integrations

Last checked: 2026-08-29

This document is for Codex/operator context. It describes which connected
services are available through the Codex plugins and which external resources
the app currently uses.

## Codex plugin access

### Notion

- Status: connected.
- Authenticated workspace user: `benet9827@gmail.com`.
- Relevant Notion search results for this project:
  - Travelgram project workspace page.
  - Supabase operations page.
  - Reference materials page.
- Use cases from Codex:
  - Search or fetch project notes.
  - Capture implementation decisions or runbooks.
  - Update project documentation pages when requested.

### Supabase

- Status: connected.
- Project used by this repo: `ikkyee`.
- Project ref/id: `pqczcponriukilrtpbdl`.
- API URL: `https://pqczcponriukilrtpbdl.supabase.co`.
- Region: `ap-southeast-2`.
- Status at last check: `ACTIVE_HEALTHY`.
- Frontend publishable key exists and matches the key used in `auth.js`.

Current app data model:

- `public.photos`: photo metadata; 7 rows at last check.
- `public.comments`: photo comments; 8 rows at last check.
- `public.profiles`: user profile nicknames; 1 row at last check.
- `public.user_likes`: per-user likes; 0 rows at last check.
- Storage bucket `photos`: public bucket; 20 objects at last check.

All checked public app tables have RLS enabled.

### Cloudflare

- Status: connected.
- Pages project for this repo: `practice-week1`.
- Pages project id: `ffe815f8-9d3c-46a4-a03d-266f78c4e289`.
- Source repo: `hansokchun/practice_week1`.
- Production branch: `main`.
- Build command: `npm run build`.
- Output directory: `dist`.
- Pages subdomain: `practice-week1-cws.pages.dev`.
- Latest checked deployment: preview deployment from branch `dev`, status `success`.

Cloudflare resources seen at last check:

- R2 binding on production Pages config:
  - Binding: `MY_BUCKET`
  - Bucket: `my-photos-storage`
  - Jurisdiction: `apac`
- D1 databases in the account:
  - `tooktrip-db` (`7cdd216c-263f-428e-97e7-55daa3f824c6`), 0 tables.

No Cloudflare D1 database is currently referenced by the local code or
`wrangler.toml`.

Workers AI integration:

- Binding: `AI`, configured in `wrangler.toml`.
- Vision model: `@cf/moondream/moondream3.1-9B-A2B` for a short image-only description.
- Structure model: `@cf/meta/llama-3.1-8b-instruct-fast` for compact Korean JSON.
- A representative image test used about 29 Neurons total. At the application
  cap of 25 analyses per account per day, that is about 725 Neurons before
  retries, below Cloudflare's current 10,000-Neuron daily free allocation.
- API boundary: `functions/api/analyze-photo.js`.
- The endpoint authenticates the Supabase session and photo owner, then reads
  the private Storage object with the user's token. No service-role key is used.
- The account owner accepted the Meta vision model license and acceptable-use
  policy on 2026-08-29. The active two-stage pipeline uses the models above.

## Local repo integration points

- `auth.js` initializes the Supabase client and wraps Auth, Database, and
  Storage calls.
- `index.html` loads the Supabase browser SDK from CDN.
- `wrangler.toml` configures Cloudflare Pages output and Workers AI:
  - `name = "ikkyee"`
  - `pages_build_output_dir = "dist"`
  - `[ai] binding = "AI"`
- `functions/api/config.js` exposes the browser-visible Google Maps API key and optional Map ID. Cloudflare Preview and Production may use `GOOGLE_MAPS_MAP_ID` (or the Vite-prefixed equivalent); no private Google credential belongs in the repository.

## Operational notes

- Prefer the Supabase plugin for schema inspection, SQL checks, advisors, and
  project metadata.
- Prefer the Cloudflare plugin for Pages deployment metadata, D1/R2 inventory,
  and account resource checks.
- Prefer the Notion plugin when project decisions, setup notes, or runbooks
  should be searched, fetched, or captured.
- Do not add Notion secrets or server-side Cloudflare/Supabase secrets to the
  frontend. Use Pages Functions or Workers if runtime server-side integrations
  are needed later.
