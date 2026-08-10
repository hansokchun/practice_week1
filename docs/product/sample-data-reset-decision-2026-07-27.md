# Pre-Launch Sample Data Reset Decision

**Date:** 2026-07-27
**Status:** Approved planning constraint

## Decision

All current pre-launch content is disposable sample data. Do not spend migration time preserving sample content when deletion and fresh QA fixtures produce a faster, clearer verification path.

The deletion scope may include:

- Database photos, albums, comments, likes, and location records
- Album-photo relationships and other content-only joins
- Current `photos` bucket Storage objects
- Demo or QA content created before the public beta

## Protected Scope

This decision does not authorize broad infrastructure or identity deletion. Auth accounts are not in the default deletion scope, and neither are database schemas, migrations, RLS policies, Storage policies, environment variables, OAuth settings, Cloudflare configuration, or encrypted backup archives.

If a future step needs to remove an Auth account or change a security configuration, treat that as a separate operation and verify the target explicitly.

## Revised Cutover Strategy

1. Deploy the signed-URL-compatible application to `main` after explicit release approval.
2. If existing sample rows or objects complicate the private Storage cutover, delete the current sample content instead of migrating or repairing it.
3. Make the `photos` bucket private and retain the approved RLS and signed-URL model.
4. Create fresh minimal three-account QA fixtures: an owner, another signed-in user, and a logged-out browser, with only the private and public photos required for access checks.
5. Verify owner access, non-owner denial, logged-out denial for private files, logged-out public Explore access, upload, delete, and signed URL expiry behavior.
6. Remove temporary QA content after the evidence is recorded, unless it is intentionally retained as the public beta starter set.

## Operational Effect

- No object-by-object rescue or compatibility repair is required for the current sample library.
- No additional backup is required solely to preserve sample content; the existing encrypted backup remains the recovery-procedure evidence.
- Safe aggregate counts may change after cleanup and should not be treated as product data-loss alerts until real beta users are admitted.
- Once public beta users create content, this exception ends. User-created production content must follow the normal backup, migration, retention, and incident safeguards.

## 2026-08-10 Cleanup Execution

The approved database cleanup was executed in one transaction after the private Storage and access-control rehearsals were complete.

- Deleted: 21 photo rows and 3 album rows.
- Cascaded to zero: album-photo relationships, comments, likes, and private location rows.
- Protected: Auth accounts and profiles remained at 3 each.
- Verified: logged-out Production Explore renders the public empty state without the former test titles or images.
- Pending Storage follow-up: 31 unlinked Storage objects remain in the private `photos` bucket. They were not deleted through SQL because that would orphan the underlying files; empty the bucket through the Supabase Storage API or Dashboard after an authenticated administrator session is available.

The remaining private objects have no database records and are not discoverable through Home, Explore, profiles, or normal signed-URL generation. This cleanup does not authorize deleting the bucket, policies, Auth accounts, or profiles.
