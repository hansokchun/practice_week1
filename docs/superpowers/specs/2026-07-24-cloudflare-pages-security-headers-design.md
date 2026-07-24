# Cloudflare Pages Security Headers Design

## Goal

Add a baseline browser security policy to Cloudflare Pages static responses without disrupting the existing Vite application, Google Maps, Supabase, or hosted fonts.

## Scope

- Add `public/_headers` so Vite copies the configuration into `dist/_headers` for Pages.
- Apply headers to all static routes: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and a minimal enforced Content Security Policy.
- Keep Pages Function responses out of scope because Cloudflare does not apply `_headers` to those responses; `/api/config` already sends `Cache-Control: no-store`.

## Policy

- Prevent embedding: `X-Frame-Options: DENY` and `frame-ancestors 'none'`.
- Prevent MIME sniffing: `X-Content-Type-Options: nosniff`.
- Keep origin-only referrer behavior: `Referrer-Policy: strict-origin-when-cross-origin`.
- Disable unused browser features: camera, microphone, geolocation, payment, and USB.
- Use a compatibility-safe CSP: `base-uri 'self'`, `object-src 'none'`, and `frame-ancestors 'none'`. No `default-src` or per-resource allow-list is added yet because the app depends on Google Maps, Supabase Storage URLs, jsDelivr, Google Fonts, and runtime-loaded map resources.

## Verification

- A source test requires the `_headers` policy and each baseline header.
- Vite build must contain `dist/_headers`.
- The deployed Preview root must return all baseline headers.
