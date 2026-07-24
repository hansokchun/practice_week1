# Public Beta Privacy Copy Plan

## Goal

Prepare review-ready, product-accurate copy for photo privacy, public location sharing, account deletion, and support contact before the Ikkyee public beta.

## Boundaries

- Do not present a draft as legal advice or a final published privacy policy.
- Do not invent a support address, retention period, or legal compliance claim.
- Do not claim self-service account deletion before it is implemented and verified.
- Keep the draft aligned with the deployed private-by-default, location-precision, Supabase, and Cloudflare behavior.

## Steps

1. Record data categories and public/private behavior from the current application and launch checklist.
2. Specify exact, approximate, and hidden public-location choices without exposing private coordinates.
3. Define a verified operator-led deletion request path and list the decisions still required before publication.
4. Add a review checklist for support contact, retention, provider notices, and legal review.
5. Mark the launch-gate task as ready for review in Notion and link the draft from the version-controlled checklist.

## Verification

- Review the draft against `photo-location-privacy.mjs`, the Storage transition plan, and the public beta launch checklist.
- Run `git diff --check` for documentation formatting.
