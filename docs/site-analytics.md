# Site activity and operator view

Approved scope: owner request on 2026-10-31. No new paid analytics provider.

## Where to check

- Sign into an administrator account → 관리자페이지 → 계정 관리. The top section shows site aggregates. The daily table's photo count opens that KST date's uploads. Below it, 최근 업로드 사진 lists12 derivative previews per page with date and account filters. Pick a member in the account directory to inspect their recent12 photos; 이 계정의 사진 모두 보기 opens their paginated collection.
- 저장된 원본 보기 requests one60-second signed original only after an explicit click. The list never includes original URLs/paths or coordinates. Closing/navigation/account or role changes clear temporary image/link references. The server rechecks the actor's current Auth admin status for every request and resolves the photo's owned storage path itself. The saved original may have been optimized during upload; an unavailable camera file cannot be restored.
- Original viewing uses existing Supabase Storage bandwidth only when opened. There is no new paid provider, schema, or subscription; large originals can consume more egress than thumbnails.
- The 방문 통계 보기 link opens the existing Cloudflare Web Analytics site report for visits, page views and referrals. A visit is not an exact person, and page load time is not dwell time. No visitor total is invented in the local dashboard.

## Metric definitions

- Total accounts: every Auth account. Registered accounts/new registrations exclude anonymous Auth sessions and include administrators. The directory's filtered total is separate from global totals.
- Photo totals include all registered photo rows, including admin landing uploads. Public count uses photo visibility; owners are distinct uploading accounts.
- 7/30-day new counts use rolling timestamps through the query time. The daily table uses KST dates and shows the latest seven of the 30 returned dates.
- Average public-screen duration is total visible seconds divided by measured completed documents over the last 30 KST dates. Empty samples display a pending state, not zero engagement.
- Duration starts only after runtime configuration resolves for an eligible public entry. It accumulates while the document is visible on landing/home/explore/tag, excludes hidden intervals, ends on pagehide or the first private-route entry, and submits once. It is capped at one hour. Back-forward-cache returns do not create a second sample. Sudden browser/app termination, blockers and network failures can omit samples; it is an estimate, not a precise full-session timer.

## Privacy and storage

Production HTTPS hosts and the existing server country exclusion apply. Dev,
preview and native apps never collect. No GA4 revival, account ID, photo ID,
precise location, search term, cookie, local-storage ID or fingerprint is added.
The first-party payload is exactly one integer field, seconds. Default server
transport sees the request IP; the application never reads/stores/forwards it or
logs payloads. Existing infrastructure access/security logs have separate policy.

Supabase stores only KST day, sample count and total seconds in a private RLS table.
The first accepted sample of a new date deletes rows more than 90 days old; older
rows can remain while no new dates are collected. No individual-event rows exist.
The server-side random ingestion credential is stored only in an ignored env file
and encrypted Pages settings; its SHA-256 digest alone is stored in private DB
configuration. Public callers cannot read the aggregates or configuration.

## Limits and cost

At most 10,000 accepted samples per KST date, one 128-byte-bounded request per
completed document, one aggregate upsert per accepted sample and no heartbeat.
This bounds accepted database writes, not incoming HTTP/DB execution volume.
Cloudflare/Supabase requests and compute use existing plan allowances and can
still consume quota; no unlimited-free or exact-human-count claim is made.
Existing usage monitoring/spend settings remain relevant.

## Deployment and operation

1. Apply `20261030163416_admin_site_overview.sql`; set a random 256-bit key's
   lowercase SHA-256 digest in private.site_activity_config via trusted tooling.
2. Encrypt Pages variables SITE_ANALYTICS_INGEST_KEY, SUPABASE_URL and
   SUPABASE_PUBLISHABLE_KEY. The latter must be an enabled publishable/anon key,
   never a service/secret key. No secrets are returned by /api/config.
3. Deploy the existing admin-accounts Edge Function with the added overview
   action, preserving its current verified handler authorization.
4. Deploy the reviewed frontend/functions and privacy notice. Only production
   with all three bindings emits siteActivityEnabled=true. Deleting the ingestion
   binding disables new collection; existing admin aggregates remain readable.
5. Verify anonymous/member aggregate denial, secret-gated sample acceptance and
   cap, KST dates, private table grants, stale admin response suppression, visible
   time behavior, preview exclusion and mobile/desktop layout.

No schema/data changes to member photos, profiles or moderation are required.
