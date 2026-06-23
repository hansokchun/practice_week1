# FUNCTIONS KNOWLEDGE

## OVERVIEW

`functions/` contains Cloudflare Pages Functions. It is a server-side edge boundary for runtime config, not a place for browser UI logic.

## STRUCTURE

```text
functions/
`-- api/
    `-- config.js    # Exposes selected public runtime config to the browser
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Google Maps runtime key | `api/config.js` | Reads `VITE_GOOGLE_MAPS_API_KEY` or `GOOGLE_MAPS_API_KEY` from Cloudflare env. |
| Pages deployment | `package.json`, `wrangler.toml` | Build to `dist`, deploy via Cloudflare Pages commands. |
| Integration notes | `docs/integrations.md` | Current Cloudflare project and env context. |

## CONVENTIONS

- Return only values that are safe for the browser.
- Use `Cache-Control: no-store` for runtime config responses unless a later requirement says otherwise.
- Keep provider secrets in Cloudflare dashboard/env settings, not repo files.
- Pages deploy scripts use project `practice-week1` and branches `dev` or `main`.

## ANTI-PATTERNS

- Do not hardcode private API keys, service-role credentials, or tokens.
- Do not put Supabase privileged operations here without explicit requirements and RLS/security review.
- Do not add framework-specific server assumptions; this is currently Cloudflare Pages Functions.
