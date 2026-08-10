# Public Beta Operations Runbook

**Owner:** Project operator (`benet9827@gmail.com`)

**Last reviewed:** 2026-07-26

**Deployment model:** GitHub `dev` -> Cloudflare Pages Preview, explicit `main` -> Cloudflare Pages Production.

## Incident Contacts

- Incident owner and internal escalation: project operator (`benet9827@gmail.com`).
- User support intake: the public support alias is still a release approval item in `docs/product/public-beta-privacy-and-support-draft-2026-07-24.md`. Until it is approved, use the operator address only for internal beta-test reports; do not publish it as the permanent support address.
- Cloudflare account access: the incident owner account documented in the 2026-07-25 dashboard audit.
- Supabase project access: project `pqczcponriukilrtpbdl`; use the connected Supabase MCP for read-only log retrieval when the dashboard is unavailable.

Never paste passwords, access tokens, private photo URLs, or raw personal data into GitHub, Notion, chat, screenshots, or incident notes. Record user roles and redacted identifiers only.

## Severity And Response Targets

| Severity | Examples | Acknowledge | First mitigation target |
| --- | --- | ---: | ---: |
| `SEV-1` | Private photo or exact-location exposure, destructive data change, all users unable to sign in or load the service | 15 minutes | 30 minutes |
| `SEV-2` | Upload, Explore, maps, or one auth provider broadly unavailable with a usable fallback | 30 minutes | 2 hours |
| `SEV-3` | Isolated account, browser, copy, or visual defect without privacy or data risk | Next working session | Next planned `dev` release |

Privacy and data integrity outrank availability. When unsure between two levels, start at the higher severity and downgrade only after evidence rules out exposure or loss.

## First 15 Minutes

1. Record the start time in KST and UTC, reporter, affected URL, branch, commit, account role, browser, and photo visibility. Redact personal data.
2. Declare `SEV-1`, `SEV-2`, or `SEV-3` and stop unrelated deployments. Do not push to `main` while the incident scope is unknown.
3. Reproduce once on the affected URL and once in a clean logged-out session when privacy permits. Do not repeatedly retry a write or deletion.
4. Check [Cloudflare Status](https://www.cloudflarestatus.com/) and [Supabase Status](https://status.supabase.com/), then open the product-specific logs below for the same time window.
5. Choose the smallest reversible mitigation: revoke publication, disable the affected user action in code, roll back the application, or pause the release.
6. For `SEV-1`, preserve timestamps and request IDs before changing configuration. Do not delete records or logs to make symptoms disappear.
7. Post an internal update with severity, scope, mitigation owner, and next update time.

## Log Paths

### Cloudflare Pages

- Build failure: Cloudflare Dashboard -> **Workers & Pages** -> `practice-week1` -> **Deployments > View details > Build log**.
- Pages Function runtime failure: open the affected production or Preview deployment, then **Deployments > View details > Functions**.
- CLI live tail for the latest production deployment:

```bash
npx wrangler pages deployment tail --project-name practice-week1 --environment production --status error
```

- CLI live tail for the latest Preview deployment:

```bash
npx wrangler pages deployment tail --project-name practice-week1 --environment preview --status error
```

Pages Functions logs are a live stream and are not stored by Cloudflare Pages. Start the tail while reproducing `/api/config`; capture only the timestamp, route, status, request ID, and redacted exception needed for the incident record.

### Supabase

Use these dashboard paths for project `pqczcponriukilrtpbdl`:

- API and Data API requests: `https://supabase.com/dashboard/project/pqczcponriukilrtpbdl/logs/edge-logs`
- Authentication: `https://supabase.com/dashboard/project/pqczcponriukilrtpbdl/logs/auth-logs`
- Storage upload and retrieval: `https://supabase.com/dashboard/project/pqczcponriukilrtpbdl/logs/storage-logs`
- Postgres errors and activity: `https://supabase.com/dashboard/project/pqczcponriukilrtpbdl/logs/postgres-logs`
- Cross-product query surface: `https://supabase.com/dashboard/project/pqczcponriukilrtpbdl/logs-explorer`

The connected Supabase MCP can retrieve the last 24 hours by service (`api`, `auth`, `storage`, or `postgres`) without changing the project. Filter by a narrow incident window and avoid exporting unnecessary headers, IP addresses, emails, or private object paths.

## Triage Matrix

| Symptom | First evidence | First reversible action |
| --- | --- | --- |
| Cloudflare build failed | Build log and failed GitHub check | Leave production unchanged; revert or fix the `dev` commit and redeploy Preview. |
| Blank page or broken static UI | Deployment commit, browser console, response headers | Roll back the production deployment, then reconcile Git using the application procedure below. |
| `/api/config` or Maps unavailable | Pages Functions live log and environment key names | Roll back the Function change or restore the approved key binding. Never copy the key value into notes. |
| Sign-in, OAuth, verification, or reset fails | Supabase Auth logs, redirect URL, provider status | Stop auth configuration changes; restore the last approved redirect/provider configuration. |
| Upload or image retrieval fails | Storage logs, then API and Postgres logs | Preserve the object and `storage_path`; roll back client or policy changes without deleting files. |
| Empty data, permission denied, or silent update | API and Postgres logs, current RLS policies | Revert the policy migration. Never disable RLS as an emergency shortcut. |
| Private photo or exact location appears publicly | Logged-out reproduction and affected row/object scope | Treat as `SEV-1`; revoke publication or make affected records private before debugging further. |

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
- The local Colima/Docker prerequisite check, first encrypted export, live schema baseline, and isolated restore rehearsal are complete.

## Runtime Values

Never commit secret values to this repository or Notion.

| Value | Location | Classification | Required control |
| --- | --- | --- | --- |
| `GOOGLE_MAPS_API_KEY` or `VITE_GOOGLE_MAPS_API_KEY` | Cloudflare Pages environment | Browser-visible API key | Restrict in Google Cloud to the Pages origins and only required Maps/Places APIs. `functions/api/config.js` returns it to the browser. |
| `GOOGLE_MAPS_MAP_ID` or `VITE_GOOGLE_MAPS_MAP_ID` | Cloudflare Pages environment | Browser-visible Map ID | Add the same approved Map ID to Preview and Production before enabling advanced markers. The runtime safely omits it when unset. |
| Supabase publishable key | `auth.js` | Browser-visible publishable key | Keep RLS enabled; this key is not a service-role secret. |
| Supabase service-role key | Supabase dashboard only, if ever needed | Secret | Do not add to browser code, GitHub, Cloudflare Pages client variables, or Notion. Use a server-side Worker/Function only. |
| Turnstile site key | Browser runtime configuration, if enabled | Browser-visible site key | Pair with a server-side Turnstile secret verification flow before treating CAPTCHA as an enforcement control. |
| Turnstile secret key | Cloudflare environment only, if verification is added | Secret | Never expose through `window`, Vite variables, or `/api/config`. |

Unused secrets should not remain attached to Pages. Confirm that no deployed Function reads them, then remove them through an approved dashboard change without copying or revealing their values.

## Pre-Production Checklist

1. Confirm the `dev` Preview serves the commit being reviewed and run `npm test` plus `npm run build` locally.
2. Verify Google Maps browser-key referrer restrictions include the production and Preview Pages origins.
3. Before the legacy Maps migration, enable Places API (New), create a JavaScript Map ID, and set `GOOGLE_MAPS_MAP_ID` in both Cloudflare environments. Then verify map styling, search, marker selection, and draggable location editing on `dev`.
4. On the current Supabase Free plan, record leaked-password protection as deferred: it requires a paid plan. After an upgrade, enable it in Supabase Auth and run one email sign-up/reset test.
5. Confirm the `photos` bucket remains public only until signed-URL Preview QA is complete. Change it to private only after the signed-URL build is on `main`.
5. Run owner, second signed-in user, and logged-out access checks for private photos, public Explore, likes, and public locations.
6. Record the tested commit, Preview URL, tester accounts by role (not credentials), and results in Notion.

## Backup And Recovery

1. On the current Supabase Free plan, automatic database backups and PITR are unavailable. Before a production schema or Storage policy change, create a local encrypted logical export with `npm run backup:db` and record its timestamp, SHA-256 checksum, and secure storage location in Notion. Do not commit the export or its credentials.
2. After a Supabase paid-plan upgrade, replace the manual export gate with the dashboard backup or PITR flow and record the available restore point.
3. Preserve real user Storage objects and `photos.storage_path` rows during normal migrations. The current pre-launch sample content is explicitly disposable and may be reset under the policy below.
4. Export no authentication credentials, access tokens, or private image URLs into project documentation.
5. For a data incident, first make affected photos private, then verify Storage object access before deleting any data.

### Manual Encrypted Export

The helper uses the official Supabase CLI `db dump` flow for roles, schema, and data. Supabase CLI 2.109.1 is pinned through `npx`. The raw SQL files exist only in a temporary directory; the retained archive is encrypted with AES-256-CBC/PBKDF2 and receives a SHA-256 checksum.

Prerequisites:

1. Install and start a Docker-compatible runtime. This Mac uses user-local Colima, Lima, and Docker CLI binaries under `~/.local/bin`; run `~/.local/bin/colima start` when the runtime is stopped. Docker Desktop is also supported. The Supabase CLI runs its compatible `pg_dump` image through Docker.
2. In Supabase Dashboard, open **Connect** and copy the percent-encoded session-pooler database connection string. Do not save it in the repository or shell history.
3. Choose a backup destination outside the repository. The default is `~/Backups/ikkyee`.
4. Use an encryption passphrase of at least 16 characters and store it separately from the archive.

Run the prerequisite check:

```bash
npm run backup:check
```

The prerequisite check passed on 2026-07-26 with Colima `0.10.3`, Lima `2.2.0`, Docker CLI `29.6.2`, and Supabase CLI `2.109.1`.

Run an interactive encrypted export:

```bash
npm run backup:db
```

The script privately prompts for the database connection string and archive passphrase, so neither value is written to shell history. It verifies that all three SQL files are non-empty, decrypts the final archive into a temporary file, and validates its tar contents. Only the `.tar.gz.enc` and `.sha256` files remain.

### First Encrypted Export Record

- Created: `2026-07-26 14:59 KST` (`2026-07-26T05:59Z`)
- Archive: `~/Backups/ikkyee/ikkyee-supabase-20260726T055809Z.tar.gz.enc`
- SHA-256: `a4de44a24ce6ad0c7cd7aa005d29a9cf520b107e25dd03b673ec5634c26560ad`
- Verification: checksum `OK`; encrypted archive and checksum file both use owner-only `600` permissions
- Secrets: the database URL and archive passphrase were not recorded in the repository, Notion, or chat
- Restore rehearsal: passed in an isolated local Supabase database on `2026-07-27`

### Restore Rehearsal

Never restore a logical export over the active production project as a test. Prefer the isolated local rehearsal because it has no hosted-project cost and cannot change the live database.

Check Docker, the pinned Supabase CLI, the latest encrypted archive, and its SHA-256 record:

```bash
npm run restore:check
```

Run the complete rehearsal:

```bash
npm run restore:db
```

Enter the backup encryption passphrase only in the hidden terminal prompt. The helper verifies the encrypted archive and its internal manifest, initializes a disposable local Supabase database, restores roles, schema, and data in one transaction, and verifies 7 tables, 24 policies, 1 trigger, and 7 RLS-enabled tables. It prints only safe aggregate row counts. On success or failure, it deletes the local database volume and all temporary plaintext files.

Rehearsal record:

- Completed: `2026-07-27`
- Archive: first encrypted export from `2026-07-26`
- Result: checksum, internal manifest, transactional restore, schema inventory, RLS inventory, trigger inventory, and safe aggregate queries passed
- Isolation: no hosted project was created and the live Supabase project was not changed
- Cleanup: no disposable container, database volume, decrypted archive, or temporary SQL directory remained
- Evidence: `docs/qa/supabase-restore-rehearsal-2026-07-27.md`

For a hosted rehearsal, create a separate Supabase project only after reviewing and approving its cost. Then follow the current Supabase backup/restore guide:

1. Decrypt and extract `roles.sql`, `schema.sql`, and `data.sql` in a temporary directory.
2. Restore with `psql --single-transaction --variable ON_ERROR_STOP=1`, applying roles, schema, and data in that order.
3. Compare extensions, key table counts, RLS policies, and Storage metadata with the source inventory.
4. Confirm Auth users must re-authenticate if the target project uses different JWT secrets.
5. Delete the temporary plaintext files and disposable project after the rehearsal record is complete.

Database logical exports include Storage metadata, not the binary objects. Preserve and inventory the `photos` bucket separately before destructive Storage work.

### Pre-Launch Sample Data Reset

The current pre-launch photos, albums, likes, comments, locations, and `photos` bucket objects are sample content and may be deleted when preservation would slow the private Storage cutover. This is a planned reset exception, not an incident-response shortcut.

- Do not spend time repairing or migrating individual sample objects.
- Keep schemas, RLS and Storage policies, environment variables, OAuth settings, Auth accounts, and encrypted backups unless a separate operation explicitly targets them.
- After reset, create only the minimum owner, non-owner, and logged-out QA fixtures required to verify private and public access.
- Once real beta users are admitted, this exception ends and normal preservation, backup, retention, and incident rules apply.
- The full decision is recorded in `docs/product/sample-data-reset-decision-2026-07-27.md`.

### Live Schema Baseline

The repository migration history does not yet contain every table, function, trigger, grant, and RLS policy that exists in the live project. Capture a data-free baseline before the disposable-project restore rehearsal:

```bash
npm run schema:pull
```

The command privately prompts for the percent-encoded Session pooler DB URL, runs the pinned Supabase CLI schema dump, rejects possible connection strings or secrets, and writes `supabase/schema.sql` with no table rows. Review and commit that generated schema. Do not treat the baseline as a replacement for small forward migrations; use it to reconstruct the current starting point in a fresh project.

Baseline record:

- Captured: `2026-07-26`
- Generator: Supabase CLI `2.109.1`
- Repository artifact: `supabase/schema.sql`
- Inventory: 7 tables, 4 functions, 24 RLS policies, 1 trigger, and 7 RLS-enabled tables
- Validation: no table-row `COPY`/`INSERT` statements, database URLs, JWTs, or Supabase secret-key patterns detected
- Privacy control: the location publication trigger and owner-only private-location policies are present; `apply_photo_location_privacy()` is revoked from `PUBLIC`
- Restore validation: the encrypted backup was applied to an isolated local Supabase database on `2026-07-27`; schema, policies, triggers, RLS coverage, and safe aggregate queries passed

## Rollback

### Application Rollback

For an active production outage, Cloudflare Dashboard rollback is the fastest mitigation:

1. Open **Workers & Pages** -> `practice-week1` -> **Deployments**.
2. From the last known-good successful production deployment, choose **Rollback to this deployment** and confirm.
3. Verify Home, `/api/config`, authentication entry, one private-photo owner view, and logged-out Explore.
4. Preview deployments are not rollback targets. A `dev` Preview failure must be fixed or reverted on `dev`.

Cloudflare rollback changes what is served but does not repair Git history. After service recovery and explicit incident-owner approval, reconcile `main` with a normal revert:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git revert <bad-release-sha>
npm test
npm run perf:budget
git push origin main
```

For a Preview-only regression, use the same flow on `dev`, then verify the new branch Preview. Never rewrite shared history during an incident.

### Photo Storage Rollback

The signed-URL compatibility work is safe to leave in place. Do not remove `photos.storage_path`, delete objects, or rotate paths during an incident. Do not make the photos bucket public as a routine availability fix. Prefer rolling back the client, signed-URL resolver, or Storage policy to the last known-good private-compatible version.

Returning a private bucket to public is an exceptional privacy decision, not a technical shortcut. It requires `SEV-1` review, an inventory of every object that would become reachable, explicit owner approval, and a documented time-limited reversal plan.

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

## Incident Record Template

```text
Title:
Severity:
Started (KST / UTC):
Detected by:
Affected URL, branch, and commit:
Affected user roles and feature:
Privacy or data-loss impact:
Cloudflare evidence:
Supabase evidence:
Mitigation and owner:
Recovery time:
Verification performed:
Root cause:
Follow-up tasks:
Next update or close time:
```

Store the record in Notion without credentials, raw logs, private URLs, exact user locations, or unredacted personal data. Link the GitHub commit and Cloudflare deployment instead of pasting full payloads.

## Closeout

1. Verify the repaired path in production or Preview, plus one adjacent path that shares the same auth, Storage, or database dependency.
2. For privacy incidents, verify owner, another signed-in user, and logged-out access before closure.
3. Run the Supabase security advisor after every RLS, function, trigger, or Storage policy change.
4. Confirm Cloudflare and Git point to the intended behavior after any dashboard rollback.
5. Record the timeline, root cause, user impact, exposure determination, mitigation, and follow-up owner in Notion.
6. Keep a `SEV-1` or recurring `SEV-2` open until a regression test or monitoring improvement is merged.
7. Review this runbook after the incident and update stale dashboard paths or commands.

## Authoritative References

- [Cloudflare Pages build logs](https://developers.cloudflare.com/pages/configuration/debugging-pages/)
- [Cloudflare Pages Functions logs](https://developers.cloudflare.com/pages/functions/debugging-and-logging/)
- [Cloudflare Pages production rollback](https://developers.cloudflare.com/pages/configuration/rollbacks/)
- [Supabase product logs and Logs Explorer](https://supabase.com/docs/guides/telemetry/logs)
