# JS MODULE KNOWLEDGE

## OVERVIEW

`js/` contains the browser app orchestrator and small feature helpers. `app.js` wires DOM, routing, state, maps, auth, uploads, public profiles, albums, and sharing.

## STRUCTURE

```text
js/
|-- app.js                         # Main SPA controller
|-- album-*.mjs                    # Album composition/detail/share helpers
|-- auth-route-guard.mjs           # Auth-required route decisions
|-- copy-formatters.mjs            # User-facing count/place strings
|-- explore-*.mjs                  # Explore map, markers, preview, discovery
|-- location-*.mjs                 # Photo coordinates and location editor
|-- oauth-*.mjs                    # Provider options and redirect rules
|-- photo-*.mjs                    # Photo validation, EXIF, location helpers
|-- profile-names.mjs              # Nickname normalization and fallback names
|-- public-*.mjs                   # Public albums/profile/demo surfaces
|-- share-*.mjs                    # Share route, completion, save state
|-- travel-*.mjs                   # Trip review/day/summary helpers
|-- upload-*.mjs                   # Upload flow and selected-photo state
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Add UI event wiring | `app.js` | Search existing handler names and route renderers first. |
| Add testable business logic | New or existing `*.mjs` helper | Keep pure and importable by Node tests. |
| Profile display names | `profile-names.mjs`, `app.js`, `auth.js` | Reads must line up with `profiles` writes. |
| Copy coordinates | `location-copy.mjs`, photo detail renderer in `app.js` | Output must be Google Maps-ready. |
| OAuth behavior | `oauth-provider-options.mjs`, `oauth-redirect-url.mjs` | Tests expect dev Pages redirect behavior. |
| Explore map behavior | `explore-*.mjs`, related render code in `app.js` | Cluster, viewport, scope, and stale-token behavior are guarded. |

## CONVENTIONS

- Prefer helper modules for decisions and formatting, with `app.js` only coordinating DOM state.
- Keep exported helpers browser-friendly and Node-test-friendly; avoid direct DOM access in pure helpers.
- Feature prefixes are meaningful: `explore-*`, `public-*`, `travel-*`, `album-*`, `location-*`, `share-*`, `upload-*`, `photo-*`.
- When touching user-facing Korean copy, verify with tests or UTF-8-aware reads before assuming terminal output is correct.
- Use `escapeHtml` or safe DOM APIs for user-controlled profile/photo/comment text.

## ANTI-PATTERNS

- Do not add more global state unless a route or persistent UI flow really needs it.
- Do not bypass Supabase wrappers in `auth.js` from UI code.
- Do not mutate copied/selected photo arrays in helpers unless the helper contract says it returns a new state.
- Do not let public profile fallback failures break UI rendering; preserve safe labels.
- Do not change OAuth redirect defaults without updating tests.
