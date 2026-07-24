# Ikkyee Public Beta Privacy And Support Draft

**Status:** Review draft only. Do not publish this document as final legal text without an operator and, where needed, legal review.

## Purpose

Ikkyee helps people keep a private travel-photo archive and selectively share travel photos on a public map. This draft gives the public beta a clear, product-accurate explanation of photos, location data, account deletion, and support.

## What The Service Handles

- Account data: email address supplied through Supabase Auth and basic authentication state.
- Profile data: nickname, optional bio, and optional avatar image.
- Archive data: uploaded photos, photo descriptions, capture dates, albums, and user-selected visibility.
- Location data: GPS metadata read from an uploaded photo or a location the owner selects manually.
- Public interaction data: likes on public photos.

The service must not ask users to share passwords, access tokens, or private storage URLs with support.

## Private By Default

- Newly uploaded photos are private unless their owner chooses to publish them.
- Private photos, private albums, and hidden locations are not intended for public Explore or public profile surfaces.
- Only photos a user has made public can appear in Explore, public albums, or public profiles.
- A user can revoke publication by changing a photo back to private. The product should remove the public pin and public detail surface after the change is saved.

## Public Location Choices

When publishing a photo, the owner controls its public location level:

| Choice | Public behavior |
| --- | --- |
| Exact location | The selected public coordinate can appear on Explore. |
| Approximate location | A public approximate coordinate can appear on Explore; the owner source coordinate remains separate from the public value. |
| Hide location | The photo is not shown as a map pin. |

Owners should review whether a home, accommodation, workplace, child, or other sensitive place is visible before choosing exact location.

## Storage And Service Providers

- The web application is delivered through Cloudflare Pages.
- Authentication, database records, and photo storage use Supabase.
- Google Maps and Places are used only to render maps and help choose locations when the relevant map surface is opened.

The public beta should publish the operator's final provider list together with its privacy notice. This repository must never contain provider secret keys or service-role credentials.

## Account And Data Deletion

The beta must provide a verified request path before public launch.

1. The user signs in to the account they want removed.
2. The operator verifies the request using that account's email address.
3. The operator removes the account's profile, photos, albums, likes, and associated Storage objects according to the approved deletion procedure.
4. The operator confirms completion without including private photo URLs or credentials in the reply.

**Current launch requirement:** direct self-service account deletion is not yet implemented. Do not claim that deletion is automatic until the request workflow, retention period, and verification method are approved and tested.

## Support Contact

**Before publishing:** set one monitored support address and insert it here. Do not use a personal address or an unmonitored alias by default.

Suggested public wording after the address is approved:

> Questions about privacy, public locations, access, or deletion can be sent to [support email]. Include the account email and a short description of the request. Never send passwords, access tokens, or private photo links.

## Operator Review Checklist

- [ ] Approve the public support email and expected response window.
- [ ] Approve the account-deletion verification and retention policy.
- [ ] Confirm the list of service providers and their public privacy notices.
- [ ] Confirm the public location wording matches the deployed database and Explore behavior.
- [ ] Obtain legal review where the launch jurisdiction or business model requires it.
- [ ] Add the approved notice and support link to the production footer before opening public sign-up.

## Related Product Rules

- `docs/product/public-beta-launch-checklist-2026-07-22.md`
- `docs/product/storage-private-transition-plan-2026-06-05.md`
- `docs/operations/public-beta-operations-runbook-2026-07-22.md`
