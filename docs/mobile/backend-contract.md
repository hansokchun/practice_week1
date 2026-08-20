# Mobile Shared Supabase Backend Contract

This is the read-only Task 5 contract for Supabase project `pqczcponriukilrtpbdl`. It was inspected at `2026-08-20T17:57:30.044Z`; the project was `ACTIVE_HEALTHY`, in `ap-southeast-2`, on Postgres `17.6.1.104`. The executable source of truth is [`mobile/src/backend-policy-contract.json`](../../mobile/src/backend-policy-contract.json).

No migration, DDL, DML, user creation, function deployment, bucket mutation, or policy mutation was performed. Live SQL inspection was limited to catalog `SELECT` queries. Database output was treated as untrusted data and reduced to schema, policy, function, aggregate, and bucket metadata; no row payload, user identifier, email, object path, credential, or signed URL is recorded.

## Repository Boundary

Mobile repositories may be created only for these tables:

| Table | Exact columns | Mobile operations allowed by current RLS |
| --- | --- | --- |
| `profiles` | `id`, `nickname`, `bio`, `avatar_url` | Public `SELECT`; authenticated own-row `INSERT`, `UPDATE`; no `DELETE` |
| `photos` | `id`, `url`, `date`, `title`, `description`, `lat`, `lng`, `liked`, `shared`, `owner_id`, `created_at`, `album`, `album_id`, `visibility`, `geo_source`, `storage_path`, `location_precision` | Owner `SELECT`, `INSERT`, `UPDATE`, `DELETE`; non-owner/anonymous `SELECT` only for `public`, `link`, or `shared=true` rows |
| `photo_private_locations` | `photo_id`, `owner_id`, `lat`, `lng`, `created_at`, `updated_at` | Authenticated owner-only `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `comments` | `id`, `photo_id`, `text`, `date`, `author_id` | `SELECT` when the target photo is owned or visible; authenticated own-author `INSERT` when the target photo is visible; no `UPDATE` or `DELETE` |
| `user_likes` | `user_id`, `photo_id`, `created_at` | Authenticated own-row `SELECT`, `INSERT`, `DELETE`; no `UPDATE`; mobile mutations use `set_photo_like` |

`albums` and `album_photos` are preserved web-only tables. The mobile repository creation list contains zero album table clients, queries, or mutations. Existing album columns on `photos` remain part of the shared live row shape but do not authorize a mobile album repository.

The JSON contract contains a complete `select`/`insert`/`update`/`delete` matrix for `owner`, `nonOwner`, and `anonymous` on every mobile table. For conditional public reads, the non-owner and anonymous fixture is a visible target; the same matrix scope explicitly denies private, unshared targets. Tests independently evaluate these fixture decisions instead of merely checking that fields exist.

## Live RLS Policies

All seven public tables in scope have RLS enabled. The mobile policy names observed live are:

- `profiles`: `Profiles are viewable by everyone`, `Users can insert own profile`, `Users can update own profile`.
- `photos`: `photos_select_owner_or_visible`, `photos_insert_owner`, `photos_update_owner`, `photos_delete_owner`.
- `photo_private_locations`: `photo_private_locations_select_owner`, `photo_private_locations_insert_owner`, `photo_private_locations_update_owner`, `photo_private_locations_delete_owner`.
- `comments`: `comments_select_visible_photo`, `comments_insert_visible_photo`. There is no comment update or delete policy.
- `user_likes`: `user_likes_select_own`, `user_likes_insert_own`, `user_likes_delete_own`. There is no like update policy.

The live Data API grants expose table privileges to client roles, while RLS determines which rows pass. These are separate layers: repository code must use a publishable client credential with the current user's JWT and must never embed a privileged backend credential.

## Functions

All five observed public functions run as `SECURITY DEFINER`:

| Function | Arguments | Contract use | Client execution |
| --- | --- | --- | --- |
| `apply_photo_location_privacy` | none | Required photo trigger; copies exact coordinates to the owner-only table and projects public precision | Not directly exposed to authenticated clients |
| `handle_new_user` | none | Required auth trigger; creates the profile row | Not directly exposed to authenticated clients |
| `set_photo_like` | `target_photo_id text`, `should_like boolean` | Required mobile RPC; atomically updates the actor's like row and count | Authenticated execution observed |
| `increment_like` | `target_photo_id text` | Preserved legacy function; not a mobile repository operation | Not exposed to authenticated clients |
| `decrement_like` | `target_photo_id text` | Preserved legacy function; not a mobile repository operation | Not exposed to authenticated clients |

The security advisor warns that authenticated callers can execute public `set_photo_like` while it runs with definer privileges. Its body currently checks `auth.uid()` and photo visibility, but the public definer surface remains a launch follow-up. The second current warning is that leaked-password protection is disabled. This task records both risks and makes no live change.

## Storage Boundary

The only application bucket is private `photos`. Its live size and MIME restrictions are unset. Object names must begin with `<auth.uid()>/`; insert and update require both object ownership and that first path segment. Delete requires object ownership.

The policies are `photos_bucket_select_owned_or_public_photo`, `photos_bucket_insert_own_folder`, `photos_bucket_update_own_object`, and `photos_bucket_delete_own_object`. Owners may read their objects. Non-owner and anonymous reads require a matching `photos.storage_path` whose photo is public or shared. Mobile display must use signed reads. Storage upsert is not equivalent to insert: it requires `SELECT`, `INSERT`, and `UPDATE` permissions, so default uploads should remain insert-only unless replacement is intentional.

## OAuth And Auth

The existing web contract uses Google and Kakao through `signInWithOAuth`; Kakao adds its provider-specific mobile option while Google uses the default scopes. Local native configuration declares `ikkyee://auth/callback` and development redirects `exp://127.0.0.1:8081` and `http://localhost:8081`.

The custom scheme must be registered by the native application, added to Supabase's allowed redirects, and reflected in each provider console where applicable. Live provider enablement, provider application identifiers, and live redirect allow-list values were not available through the permitted read-only metadata tools, so they are explicitly unknown rather than inferred from local configuration. No Edge Functions are deployed or required by this client contract.

## Drift And Limits

The contracted live policy names, commands, roles, RLS flags, function security modes, and Storage policies match `supabase/schema.sql`; `policyDrift.status` is `matched`. Live migration history contains 12 entries, while the repository keeps four later migration files plus the schema baseline. This history difference is recorded and is not treated as policy drift.

Live runtime impersonation was not attempted because the allowed SQL channel was `SELECT`-only; transaction-local role/claim setup would require non-`SELECT` statements. Evidence therefore combines live `pg_catalog`/`information_schema` capture with executable owner/non-owner/anonymous fixtures and labels that limitation as `catalog-plus-fixture`.

The sanitized live snapshot is hash-bound at `.omo/evidence/task-5/backend/live/catalog-sanitized.json`. Before/after aggregate fingerprints cover migration, public-function, bucket, and policy counts to prove that this inspection did not mutate those surfaces.

## Official Sources

Checked on 2026-08-20 UTC:

- [Supabase changelog](https://supabase.com/changelog.md): current 2026 changes did not directly alter this hosted RLS/Storage contract.
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): exposed-schema RLS and operation-specific policy behavior.
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control): `storage.objects` policies and upsert permissions.
- [Native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking): application callback registration.
- [Google social login](https://supabase.com/docs/guides/auth/social-login/auth-google): provider and redirect configuration.
- [Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api): grants and RLS as separate controls.
