# Cookie-Free Web Analytics

## Purpose And Scope

Replace consent-gated GA4 with Cloudflare Web Analytics on 2026-10-15.
The owner requested visit counts and referral sources without a consent banner.
No advertising, cookies, stored visitor identifiers or fingerprinting are added.
The GA property remains available for historical reports; it is not deleted.

- Site: `ikkyee.com`; site tag `c33f9959d44a482382a9dea6aa9affb6`.
- Public beacon token: `c3544ec773524f6987e6ce84dc4476c3`, not an API secret.
- Manual snippet mode avoids automatic injection into private pages or native
  builds. Do not also enable Pages build-time injection or automatic zone setup.
- `functions/api/config.js` returns the token only on production hosts and only
  for a known country outside EEA/EU, UK and Switzerland. Config remains no-store.
- Official beacon with `spa: false`: one initial document measurement, not one
  event for every hash navigation. Supported entries: landing, home, explore, tag.
- Direct entries to photos, liked, albums, profiles, settings, auth, upload and
  administrator screens are excluded. Dev, localhost and native apps are excluded.
  This intentionally means fewer visits than all possible service traffic.
- No app account fields, coordinates, search terms or custom events are supplied.
  The official SDK also collects browser/device and page performance information.
  Do not describe this as zero data collection or exact unique-person counting.

## Privacy Boundaries

The official 2026.10.0 script was inspected before activation: its page location
and referrer sanitizer removes username/password, query and hash before sending
them; navigation timings use a field allowlist, not the navigation URL. Hash
routes therefore do not expose OAuth tokens or content IDs in those page fields.
Web Vitals can include image URLs and CSS selectors as diagnostic metadata.
Disclose that limitation; do not expand collection to private direct-entry pages.
Review the SDK again if Cloudflare changes its behavior.

Cloudflare says the beacon does not use browser storage or fingerprints and
discards transport IP addresses at the nearest data center. Country gating reads
Cloudflare's request metadata transiently; no IP or country is saved by this app.
This is a technical privacy configuration, not a guarantee that every jurisdiction
has identical legal requirements. Keep the operating privacy notice current.

## Operator View

[Ikkyee visits and referrals](https://dash.cloudflare.com/3cfafb9cc160b2c0b0c5eaa13c62c07d/web-analytics/overview/visits?siteTag~in=c33f9959d44a482382a9dea6aa9affb6&excludeBots=Yes)

Use Visits, Page views and Referer hosts. Visits are sessions/entries as defined
by Cloudflare, not exact unique humans. Internal route labels are not counted.
No UTM attribution, user journeys, custom events or cross-device identification
are implemented. Mobile web is included; the native app is not.

## Live Verification On 2026-10-15

- Deployed to dev `3bcf5b1` and production `fbcd33c`; production deployment
  `ea75ef9b-f603-4e3c-89db-ccc0c84e6a92` became active.
- The obsolete production `GOOGLE_ANALYTICS_MEASUREMENT_ID` binding was removed.
  Maps API key/Map ID remained configured.
- The production browser loaded exactly one official Cloudflare script with
  `spa: false`, no Google analytics tag, and no consent banner or toggle.
- Desktop and 390 x 844 mobile screens remained styled; footer privacy link
  opened the updated analytics notice. Native build also passed.
- At 2026-10-15 12:17 KST, the Last 24 hours / exclude bots report showed
  **2 visits, 2 pageviews**, including QA traffic. This validates ingestion,
  not two external people. No claim of exact unique users is made.
- Full tests: dev 1,143; production 993. Both web builds passed.

## Verification

1. Open production Main/Landing in a clean session: no analytics consent prompt,
   no Google analytics script/request, exactly one Cloudflare beacon script.
2. Verify `/api/config` returns a token for a KR production request, none for
   preview, unknown country or excluded regions. Maps configuration is preserved.
3. Change Main to Map: no duplicate beacon load or SPA pageview integration.
4. Direct private/admin/native entries: no beacon. Navigate away while config is
   loading: do not initialize on the new screen.
5. Privacy links in footer/settings open `/privacy/#analytics`.
6. Confirm the dashboard receives actual pageviews; blockers may prevent them.
   Never treat an absent beacon under an ad blocker as a broken login.

## Official References

- [Getting started](https://developers.cloudflare.com/web-analytics/get-started/)
- [Disable SPA measurement](https://developers.cloudflare.com/web-analytics/get-started/web-analytics-spa/)
- [RUM data and privacy](https://developers.cloudflare.com/speed/observatory/rum-beacon/)
- [Visit definitions](https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/)
