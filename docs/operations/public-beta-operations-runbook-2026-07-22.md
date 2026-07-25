# Public Beta Operations Runbook

**Owner:** Project operator (`benet9827@gmail.com`)  
**Last reviewed:** 2026-07-25

**Deployment model:** GitHub `dev` -> Cloudflare Pages Preview, explicit `main` -> Cloudflare Pages Production.

## Service Inventory

| Service | Resource | Operator action |
| --- | --- | --- |
| GitHub | `hansokchun/practice_week1` | Use `dev` for all implementation and Preview validation. Only move to `main` after release approval. |
| Cloudflare Pages | `practice-week1` | Builds with `npm run build`; serves `dist`; production branch is `main`. |
| Supabase | `pqczcponriukilrtpbdl` (`ikkyee`) | Hosts Auth, Postgres, RLS policies, and the `photos` Storage bucket. |
| Notion | Travelgram project workspace | Tracks launch gates, decisions, and QA outcomes. |

## 2026-07-25 Live Dashboard Audit

- The Cloudflare account is accessible by the documented operator account.
- Pages project `practice-week1` is connected to `hansokchun/practice_week1`.
- Production branch `main`, automatic deployments, build command `npm run build`, and output directory `dist` match this runbook.
- Production has encrypted `GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_MAPS_API_KEY` entries. These are browser-visible in application use even though Cloudflare stores them as encrypted values.
- The unused encrypted `SUPABASE_JWT_SECRET` was removed from both Production and Preview after repository-wide usage checks. Its value was not inspected.
- Unused R2 binding `MY_BUCKET` was removed from Production. The `my-photos-storage` bucket itself was not changed or deleted.
- `npm run backup:check` still fails because Docker is not installed. The first encrypted export and disposable-project restore rehearsal remain incomplete.

## Runtime Values

Never commit secret values to this repository or Notion.

| Value | Location | Classification | Required control |
| --- | --- | --- | --- |
| `GOOGLE_MAPS_API_KEY` or `VITE_GOOGLE_MAPS_API_KEY` | Cloudflare Pages environment | Browser-visible API key | Restrict in Google Cloud to the Pages origins and only required Maps/Places APIs. `functions/api/config.js` returns it to the browser. |
| Supabase publishable key | `auth.js` | Browser-visible publishable key | Keep RLS enabled; this key is not a service-role secret. |
| Supabase service-role key | Supabase dashboard only, if ever needed | Secret | Do not add to browser code, GitHub, Cloudflare Pages client variables, or Notion. Use a server-side Worker/Function only. |
| Turnstile site key | Browser runtime configuration, if enabled | Browser-visible site key | Pair with a server-side Turnstile secret verification flow before treating CAPTCHA as an enforcement control. |
| Turnstile secret key | Cloudflare environment only, if verification is added | Secret | Never expose through `window`, Vite variables, or `/api/config`. |

Unused secrets should not remain attached to Pages. Confirm that no deployed Function reads them, then remove them through an approved dashboard change without copying or revealing their values.

## Pre-Production Checklist

1. Confirm the `dev` Preview serves the commit being reviewed and run `npm test` plus `npm run build` locally.
2. Verify Google Maps browser-key referrer restrictions include the production and Preview Pages origins.
3. On the current Supabase Free plan, record leaked-password protection as deferred: it requires a paid plan. After an upgrade, enable it in Supabase Auth and run one email sign-up/reset test.
4. Confirm the `photos` bucket remains public only until signed-URL Preview QA is complete. Change it to private only after the signed-URL build is on `main`.
5. Run owner, second signed-in user, and logged-out access checks for private photos, public Explore, likes, and public locations.
6. Record the tested commit, Preview URL, tester accounts by role (not credentials), and results in Notion.

## Backup And Recovery

1. On the current Supabase Free plan, automatic database backups and PITR are unavailable. Before a production schema or Storage policy change, create a local encrypted logical export with `npm run backup:db` and record its timestamp, SHA-256 checksum, and secure storage location in Notion. Do not commit the export or its credentials.
2. After a Supabase paid-plan upgrade, replace the manual export gate with the dashboard backup or PITR flow and record the available restore point.
3. For the `photos` bucket, keep the Storage object inventory and database `photos.storage_path` rows intact. Do not delete original objects during a privacy rollout.
4. Export no authentication credentials, access tokens, or private image URLs into project documentation.
5. For a data incident, first make affected photos private, then verify Storage object access before deleting any data.

### Manual Encrypted Export

The helper uses the official Supabase CLI `db dump` flow for roles, schema, and data. Supabase CLI 2.109.1 is pinned through `npx`. The raw SQL files exist only in a temporary directory; the retained archive is encrypted with AES-256-CBC/PBKDF2 and receives a SHA-256 checksum.

Prerequisites:

1. Install and start Docker Desktop. The Supabase CLI runs its compatible `pg_dump` image through Docker.
2. In Supabase Dashboard, open **Connect** and copy the percent-encoded session-pooler database connection string. Do not save it in the repository or shell history.
3. Choose a backup destination outside the repository. The default is `~/Backups/ikkyee`.
4. Use an encryption passphrase of at least 16 characters and store it separately from the archive.

Run the prerequisite check:

```bash
npm run backup:check
```

Run an interactive encrypted export:

```bash
npm run backup:db
```

The script privately prompts for the database connection string and archive passphrase, so neither value is written to shell history. It verifies that all three SQL files are non-empty, decrypts the final archive into a temporary file, and validates its tar contents. Only the `.tar.gz.enc` and `.sha256` files remain.

### Restore Rehearsal

Never restore a logical export over the active production project as a test. Create a disposable Supabase project and follow the current Supabase backup/restore guide:

1. Decrypt and extract `roles.sql`, `schema.sql`, and `data.sql` in a temporary directory.
2. Restore with `psql --single-transaction --variable ON_ERROR_STOP=1`, applying roles, schema, and data in that order.
3. Compare extensions, key table counts, RLS policies, and Storage metadata with the source inventory.
4. Confirm Auth users must re-authenticate if the target project uses different JWT secrets.
5. Delete the temporary plaintext files and disposable project after the rehearsal record is complete.

Database logical exports include Storage metadata, not the binary objects. Preserve and inventory the `photos` bucket separately before destructive Storage work.

## Rollback

### Application Rollback

1. Identify the last known-good commit on `main` or `dev`.
2. Revert the release commit on the relevant branch.
3. Run tests and build, then push the revert. Cloudflare Pages deploys the previous behavior automatically.
4. Verify the deployed HTML references the expected release and repeat the affected smoke test.

### Photo Storage Rollback

The signed-URL compatibility work is safe to leave in place. Do not remove `photos.storage_path` during an incident. If a private bucket causes unavailable images, temporarily return `storage.buckets.public` for `photos` to `true`, then investigate signed URL and RLS failures before another private cutover.

### Location Privacy Rollback

Do not drop `photo_private_locations` as an emergency shortcut; it contains the source coordinates. If a release needs the legacy location behavior, restore public map columns from owner values before reverting the client:

```sql
update public.photos p
set lat = l.lat,
    lng = l.lng
from public.photo_private_locations l
where l.photo_id = p.id;
```

Use this only with an explicit privacy decision because it restores exact coordinates to publicly readable rows.

## Incident Triage

1. Confirm the affected branch, deployment URL, browser state, account role, and photo visibility.
2. Check Supabase API, Auth, Storage, and Postgres logs for the incident window.
3. Run the Supabase security advisor after every RLS, trigger, or Storage policy change.
4. Prefer revoking publication or making a photo private before changing application code under pressure.
5. Write the timeline, mitigation, and follow-up task in Notion before closing the incident.
