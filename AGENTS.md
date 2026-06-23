# PROJECT KNOWLEDGE BASE

**Generated:** 2026-06-24
**Commit:** cd81433
**Branch:** dev

## OVERVIEW

Ikkyee is a Vite-powered vanilla JavaScript travel photo journal. The app stores auth, profile, photo, album, comment, like, and storage data in Supabase, uses Google Maps for location surfaces, and deploys through Cloudflare Pages.

## STRUCTURE

```text
.
|-- index.html            # Static app shell and route/page markup
|-- style.css             # Main responsive UI stylesheet
|-- auth.js               # Supabase Auth/DB/Storage integration boundary
|-- js/                   # Feature helpers plus the app orchestrator
|-- test/                 # Node built-in tests and source-contract checks
|-- functions/api/        # Cloudflare Pages Functions
|-- docs/                 # Spec, integration notes, lessons learned
|-- images/               # App imagery referenced by the shell
|-- package.json          # Scripts and Vite dependency
|-- wrangler.toml         # Cloudflare Pages output config
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Main routing, UI rendering, event binding | `js/app.js` | Large orchestration file; avoid broad edits. |
| Supabase reads/writes | `auth.js` | Browser publishable key is expected; never add service keys. |
| Pure feature behavior | `js/*.mjs` | Prefer small helper modules with matching tests. |
| Markup or static route contracts | `index.html` | Several tests assert exact structure/classes. |
| Responsive layout and visual states | `style.css` | Very large file; inspect existing selectors first. |
| Cloudflare env bridge | `functions/api/config.js` | Returns Google Maps key with `Cache-Control: no-store`. |
| Current requirements | `docs/spec.md` | Treat as the project spec ledger when current. |
| Repeated mistakes | `docs/lessons_learned.md` | Read before changing profile, RLS, or navigation behavior. |

## CODE MAP

| Symbol/File | Type | Location | Role |
| --- | --- | --- | --- |
| `state` | object | `js/app.js` | Central UI/session state for current user, photos, albums, maps, editor state. |
| `getCurrentRoute` | function | `js/app.js` | Parses current hash route via route helpers. |
| `getSupabase` | function | `auth.js` | Lazy browser Supabase client factory. |
| `updateNicknameInDB` | function | `auth.js` | Writes nicknames to `profiles`; RLS must allow insert/update. |
| `fetchProfilesByIds` | function | `auth.js` | Reads display profiles by `id` and fallback `user_id`. |
| `getProfileDisplayName` | function | `js/profile-names.mjs` | Safe nickname/profile fallback behavior. |
| `formatMapSearchLocation` | function | `js/location-copy.mjs` | Produces Google Maps-ready `lat,lng` copy text. |
| `getOAuthProviderOptions` | function | `js/oauth-provider-options.mjs` | OAuth scopes/options, including Kakao profile scopes. |
| `getOAuthRedirectUrl` | function | `js/oauth-redirect-url.mjs` | Normalizes local/preview redirects to the dev Pages alias. |
| `onRequestGet` | function | `functions/api/config.js` | Cloudflare Pages Function for public runtime config. |

## CONVENTIONS

- Work on `dev` and push verified local changes to `origin/dev`; do not update `main` unless the user explicitly asks.
- Existing dirty files may be user work. Read and work around them; do not revert unrelated changes.
- Use `npm test` and `npm run build` before claiming behavior changes are complete.
- Add or update `node:test` coverage before feature/bugfix implementation when behavior changes.
- Keep reusable logic in `js/*.mjs` helpers when possible, then let `js/app.js` coordinate UI wiring.
- Treat Korean mojibake in PowerShell output as a display warning, not proof of file corruption.

## ANTI-PATTERNS

- Do not add private provider secrets, Supabase service-role keys, or Cloudflare tokens to the frontend repo.
- Do not change profile persistence logic before checking Supabase `profiles` RLS policies.
- Do not trust helper tests alone for sidebar/panel navigation; authenticated browser flow matters.
- Do not decorate copied map coordinates; Google Maps copy format must remain plain `lat,lng`.
- Do not assume album visibility controls Explore map pins; photo visibility drives pin scope.
- Do not rewrite the app shell or large CSS areas for a narrow feature.

## COMMANDS

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
npm run cf:deploy:dev
npm run cf:deploy:main
```

## NOTES

- Current integration context is in `docs/integrations.md`.
- `README.md` and some older comments may render as mojibake in this terminal.
- Supabase project ref is `pqczcponriukilrtpbdl`; API URL is `https://pqczcponriukilrtpbdl.supabase.co`.
- Cloudflare Pages project is `practice-week1`; production branch is `main`, preview/dev branch is `dev`.
- LazyCodex/OmO was installed in the user Codex plugin cache, but `doctor` previously hit Windows `spawn EPERM` in this environment.
