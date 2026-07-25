# Ikkyee Public Beta Metrics

**Status:** Approved v1 definition for the public beta  
**Owner:** Project operator  
**Review cadence:** Weekly, after each full signup cohort has had seven days to activate

## Purpose

The beta needs enough evidence to answer one question: do new members reach Ikkyee's core value of turning travel photos into a useful, selectively shareable map? The first version deliberately uses existing first-party Supabase records instead of observing every click.

## Privacy Boundary

- No client analytics SDK.
- No analytics cookies.
- No new event table or browser fingerprint.
- Run the operator query manually in the Supabase SQL Editor; do not expose it through the web client or a public endpoint.
- Store only aggregate weekly counts and rates in the working board. Do not retain or export the row-level joins used to calculate them.
- Suppress every cohort with fewer than 5 eligible sign-ups. Do not combine a small result with another report to identify a person.
- Do not include email addresses, IP addresses, user-agent or device fingerprints, raw user IDs, exact or approximate coordinates, photo IDs, photo URLs, descriptions, EXIF, search terms, or map-view trails in reports.

This policy adds no telemetry storage and therefore creates no new retention obligation. Weekly aggregate snapshots may be kept for the duration of the beta and deleted when they no longer inform product decisions.

## Metric Definitions

All activation rates use non-anonymous sign-ups as the denominator and a seven-day window beginning at each account's `auth.users.created_at`. Cohorts are grouped by UTC signup week and are reported only after every included member has had the full seven-day window.

| Metric | Existing source | Definition | Product question |
| --- | --- | --- | --- |
| Sign-up | `auth.users` | Count of non-anonymous accounts created in the cohort | How many people entered the beta? |
| First upload | `photos.owner_id`, `photos.created_at` | Share of the signup cohort that created at least one photo within seven days | Did they reach the archive's first useful action? |
| First album | `albums.owner_id`, `albums.created_at` | Share of the signup cohort that created at least one album within seven days | Did they organize a trip beyond one photo? |
| First publish | `photos.created_at`, `photos.visibility`, `photos.shared` | Share of the signup cohort with a currently public photo created within seven days | Did they choose to share after reviewing privacy? |
| Explore engagement | `user_likes`, `photos` | Share of the signup cohort that liked another owner's public photo within seven days | Did they deliberately engage with public discovery? |

`visibility = 'public'` is the current publication rule. `shared = true` remains a compatibility fallback for older records until that legacy field is retired.

Explore engagement intentionally does not count page views, map movement, searches, modal opens, or logged-out browsing. A like on another owner's public photo is a smaller but clearer first-party signal. Self-likes and likes on non-public photos are excluded.

## Known V1 Limits

- Supabase currently stores the photo creation time, not a separate publication timestamp. First publish is therefore a current-state proxy: a currently public photo created during the activation window. It cannot prove exactly when the owner changed visibility.
- Deleted photos and albums no longer contribute to first upload or first album. Removed likes no longer contribute to Explore engagement.
- These survivorship limits can undercount completed actions. Use the metrics for broad weekly direction, not billing, individual evaluation, or causal claims.
- Fixing these limits would require purpose-built event retention. That remains out of scope until the separate privacy review in Change Rules is complete.

## Weekly Operation

1. Run `scripts/report-public-beta-metrics.sql` in the Supabase SQL Editor using an operator account.
2. Confirm the output contains only cohort week, suppression state, aggregate counts, and percentages.
3. Record only unsuppressed aggregate values in Notion. Do not download underlying rows or attach CSVs containing identifiers.
4. Compare trends only after multiple complete cohorts. Treat very small absolute changes as directional, not conclusive.
5. Record a short decision: continue, investigate a funnel step, or make no change. Do not optimize for more public sharing at the expense of private-by-default behavior.

## Feedback Intake Boundary

Beta feedback is tracked separately from behavioral metrics and labeled `bug`, `usability`, or `feature request`. Until the public support address is approved, use the private project board only. Feedback notes must exclude passwords, access tokens, private photo links, precise locations, and copied account data; use a redacted incident reference when investigation is required.

## Change Rules

A future analytics tool, new event, longer retention period, or user-level dashboard requires a separate privacy review, documented purpose, deletion rule, and operator approval before implementation. This v1 definition does not authorize third-party analytics or client-side tracking.

## Related Files

- `scripts/report-public-beta-metrics.sql`
- `docs/product/public-beta-launch-checklist-2026-07-22.md`
- `docs/product/public-beta-privacy-and-support-draft-2026-07-24.md`
- `docs/operations/public-beta-operations-runbook-2026-07-22.md`
