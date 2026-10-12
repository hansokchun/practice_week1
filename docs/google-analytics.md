# Google Analytics (GA4)

## Current Status

The web integration is prepared, but collection is OFF until a real measurement
ID is configured. No property or account was created or terms accepted by Codex.
The Google account open on 2026-10-13 showed the initial Analytics welcome page.
The native mobile app is not instrumented by this web-only integration.

## Initial Setup

1. Open https://analytics.google.com/ and choose **측정 시작**.
2. Create an account and an **Ikkyee** property. Use Korea time and KRW; choose
   the free standard service, not Analytics 360. Review optional data sharing
   and leave it off unless needed. The owner must review and accept the terms.
3. Create a **웹** data stream for **https://ikkyee.com**.
4. Turn **향상된 측정 (Enhanced measurement)** OFF for the entire stream.
   Automatic history, outbound links, site search and forms may otherwise send
   unsanitized content URLs or duplicate this SPA's manual pageviews.
5. Keep Google Signals, user-provided data collection, advertising features and
   cross-domain measurement OFF. Do not connect Google Ads for this setup.
   Set event/user data retention to 2 months; review the operating privacy notice
   and any applicable international data-processing disclosures before enabling.
6. Copy the **측정 ID**, beginning with `G-`, not a numeric property ID or a
   `GTM-` container ID. This ID is public and is not a private API credential.
7. In Cloudflare **Workers & Pages → practice-week1 → Settings → Variables and
   Secrets**, add a Production text variable named
   `GOOGLE_ANALYTICS_MEASUREMENT_ID` with that value, then redeploy main.
   Codex can complete this step after the owner supplies the measurement ID.
   Do not add a token, password or private Google key to frontend code.

## Implemented Behavior

- Production HTTPS hosts only: `ikkyee.com`, `www.ikkyee.com`. Preview, localhost
  and dev Pages aliases do not load the Google tag or pollute production stats.
- Basic consent: no tag, Google request or GA cookie before explicit opt-in.
  The banner is absent while no measurement ID is configured.
- Choices are per browser, stored separately from signed-in account settings.
  Both guests and members can use **방문 통계 설정** in the footer. Members also
  have **설정 → 개인정보 및 도움말 → 방문 통계 허용**.
- Withdrawal clears `_ga` cookies on this domain, disables collection immediately
  and refreshes the document to unload the tag. Other tabs observe the withdrawal.
  Already aggregated historical data is not deleted by this browser operation.
- 28-day cookies without automatic lifetime extension; denied advertising storage,
  ad user data and personalization. Google Signals disabled in tag configuration.
- Only manual `page_view` events with a fixed route allowlist. No application
  account identifier, email, nickname, photo/album ID or title, search term,
  coordinates, full hash/query URL or sensitive form payload is supplied.
- Referrals are reduced to the external origin. Query/hash/path and same-site
  content referrals are not forwarded. Automatic attribution/ads are not a goal.
- Admin, settings, upload, location assignment and creation flows are excluded.
  Initial rendering waits for app startup to finish, avoiding shell-only views.
- GA's browser/cookie identifiers are pseudonymous, not completely anonymous.
  Network requests necessarily disclose transport information to Google.

The page paths below are analytics labels, not actual web routes:

| App Surface | Analytics Path |
| --- | --- |
| Landing | `/welcome` |
| Main | `/main` |
| Map | `/map` |
| Tag collection | `/topics` |
| Album view | `/album` |
| Profile | `/profile` |
| Photo list | `/photos` |
| Liked photos | `/favorites` |

## Verification After Activation

1. Open a fresh browser/session on ikkyee.com. Reject or leave the banner alone:
   Network must show no `googletagmanager.com` or `google-analytics.com` request.
2. Allow on Main, then navigate to Map. Realtime should receive one manual
   `page_view` per screen change, with `/main` then `/map`, no hash or parameters.
3. Check Admin/settings/location assignment: no pageview or content identifier.
4. Withdraw from the footer/settings: GA cookies disappear and the fresh document
   sends no analytics requests. Login, Maps, upload and photos must still work.
5. Check mobile width and desktop; ad blockers may intentionally prevent tracking.
   Consent-gated counts are not the total number of all visitors. Do not diagnose
   an ad blocker as a failed login or broken site.

Do not claim active reporting merely because the frontend is deployed. A valid
property, its privacy-safe stream settings, runtime ID, and a real consented
Realtime test are all required for end-to-end activation.

## Official References

- [Basic consent mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic)
- [Manual pageviews](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [GA4 configuration](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)
