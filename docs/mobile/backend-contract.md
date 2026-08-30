# Mobile Shared Supabase Backend Contract

This is the read-only Task 5 contract for Supabase project `pqczcponriukilrtpbdl`. It was inspected at `2026-08-20T17:57:30.044Z`; the project was `ACTIVE_HEALTHY`, in `ap-southeast-2`, on Postgres `17.6.1.104`. The executable source of truth is [`mobile/src/backend-policy-contract.json`](../../mobile/src/backend-policy-contract.json).

No migration, DDL, DML, user creation, function deployment, bucket mutation, or policy mutation was performed. Live SQL inspection was limited to catalog `SELECT` queries. Database output was treated as untrusted data and reduced to schema, policy, function, aggregate, and bucket metadata; no row payload, user identifier, email, object path, credential, or signed URL is recorded.

> 이 문서의 위 설명은 2026-08-20 운영 환경 관찰 기록이다. 2026-08-24에 아래의 모바일 링크 후보 계약을 저장소와 로컬 Supabase에 추가했지만 운영 환경에는 아직 배포하지 않았다.

## Local Mobile Profile Candidate

- `profiles.avatar_path`는 모바일이 관리하는 공개 아바타의 정규 경로다. 기존 웹·OAuth의 `avatar_url`은 호환을 위해 유지하며, 모바일 공개 프로필은 유효한 `avatar_path`를 우선한다.
- 공개 `avatars` 버킷은 2MiB·`image/jpeg`로 제한한다. 인증 사용자는 본인 UUID 폴더의 `avatar-<uuid>.jpg` 불변 경로만 `INSERT`, 본인 객체만 `SELECT`·`DELETE`할 수 있고 `UPDATE` 정책은 없다.
- 모바일은 선택 이미지를 최대 변 512px JPEG로 다시 렌더링하고 메타데이터 제거를 재검증한다. 새 객체 업로드 뒤 프로필 행을 전환하며 DB 실패 시 새 객체를 보상 삭제하고 성공 시 이전 객체를 정리한다.
- 빈 로컬 DB 마이그레이션 재생과 실제 publishable-key 클라이언트로 소유자·비소유자·익명 프로필/Storage 왕복을 검증했다. 운영 마이그레이션 적용과 원격 역할 재검증 전에는 운영 계약으로 간주하지 않는다.

## Local Mobile Link Candidate

- 모바일 링크 사진은 기존 웹의 `visibility = 'link'` 행을 변경하지 않고 `visibility = 'private'`, `shared = false`로 저장한다.
- 앱이 만든 256-bit 원문 토큰은 백업 제외 로컬 게시 작업에만 저장한다. `photos.link_token_hash`에는 SHA-256 소문자 64자리 해시만 저장하며 DB 제약과 부분 고유 인덱스로 형식을 고정한다.
- 공개 `photo-link` Edge Function만 원문 토큰을 받는다. 이 함수는 정확한 해시·비공개·비공유 행을 privileged server client로 조회하고 위치·Storage 경로·토큰 해시를 제외한 안전한 사진 투영과 5분 Storage 서명 URL만 반환한다.
- 잘못되거나 만료·삭제된 링크는 원인을 구분하지 않는 404와 `Cache-Control: no-store`를 반환한다. 토큰과 해시는 로그나 응답에 기록하지 않는다.
- 로컬 검증은 익명·비소유자의 직접 DB 읽기 차단, 소유자 읽기, 토큰 고유 인덱스, 잘못된 토큰 거부, 정상 토큰의 서명 URL 응답을 포함한다. 운영 migration history 정합성 확인, 마이그레이션·함수 배포, 원격 RLS·Storage 검증 전에는 출시 계약으로 간주하지 않는다.

## Local Account Deletion Candidate

- `delete-account` Edge Function은 클라이언 사용자 ID 대신 Bearer token을 `auth.getUser` 재검증하고 고정 `DELETE_ACCOUNT` 확인값을 요구한다.
- Auth 사용자 삭제 전에 `photos`·`avatars` 소유자 경로, 신고·차단·댓글·좋아요·사진·기존 웹 앨범·프로필 행을 순차로 정리한다. 중간 실패는 Auth delete로 넘기지 않으며 다시 실행할 수 있다.
- 앱은 서버 요청 전에 백업 제외 SQLite와 썸네일·게시 파생본을 정리하고 기기 원본을 유지한다. 서버 삭제 성공 뒤 로컬 세션을 제거한다.
- 로컬 실제 왕복은 인증·확인 경계, 대상 Auth·DB·Storage 전체 제거, 비교 사용자 보존을 확인했다. 운영 함수 배포와 원격 재검증 전에는 출시 계약으로 간주하지 않는다. 세부 운영 계약은 `docs/mobile/account-deletion-operations.md`에 따른다.

## Shared Web And Mobile Visibility

- 웹과 모바일은 같은 Supabase Auth, `profiles`, `photos`, `user_likes`, `comments`를 사용한다. 웹에서 사진을 삭제하거나 비공개로 바꾸면 모바일은 화면 재진입·포그라운드 복귀 시 서버의 현재 공개 범위를 다시 조회한다.
- Explore, 좋아요, 공개 사진·댓글, 공개 프로필, 내 프로필 요약은 재조회 시 기존 이미지·미리보기·댓글을 먼저 제거한다. 비공개·삭제 행은 RLS 조회에서 제외되고, 토큰이 해제된 링크는 잘못된 링크와 같은 404를 받는다.
- 이미 발급한 Storage 서명 URL은 데이터 공개 상태와 독립적으로 최대 300초 유효할 수 있으며 CDN 캐시도 독립적으로 동작한다. 사진 삭제는 DB 행과 Storage 객체를 함께 제거하고, 세부 재검증·잔존 제한은 `docs/mobile/content-visibility-cache.md`를 따른다.

## Repository Boundary

Mobile repositories may be created only for these tables:

| Table | Exact columns | Mobile operations allowed by current RLS |
| --- | --- | --- |
| `profiles` | `id`, `nickname`, `bio`, `avatar_url`, 후보 `avatar_path` | Public `SELECT`; authenticated own-row `INSERT`, `UPDATE`; no `DELETE` |
| `photos` | `id`, `url`, `date`, `title`, `description`, `lat`, `lng`, `liked`, `shared`, `owner_id`, `created_at`, `album`, `album_id`, `visibility`, `geo_source`, `storage_path`, `location_precision` | Owner `SELECT`, `INSERT`, `UPDATE`, `DELETE`; non-owner/anonymous `SELECT` only for `public`, `link`, or `shared=true` rows |
| `photo_private_locations` | `photo_id`, `owner_id`, `lat`, `lng`, `created_at`, `updated_at` | Authenticated owner-only `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `comments` | `id`, `photo_id`, `text`, `date`, `author_id` | `SELECT` when the target photo is owned or visible; authenticated own-author `INSERT` when the target photo is visible; no `UPDATE` or `DELETE` |
| `user_likes` | `user_id`, `photo_id`, `created_at` | Authenticated own-row `SELECT`, `INSERT`, `DELETE`; no `UPDATE`; mobile mutations use `set_photo_like` |

`albums` and `album_photos` are shared with mobile through one read-only repository. Mobile may select only the signed-in owner's album rows, ordered assignments, and RLS-visible photo rows. Album insert, update, delete, upsert, and RPC operations remain prohibited until a separate editing contract is approved. Existing album columns on `photos` remain part of the shared live row shape and do not independently authorize album writes.

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

The local candidate also adds the public `avatars` bucket described above. It has not been observed or applied in the live project yet.

The policies are `photos_bucket_select_owned_or_public_photo`, `photos_bucket_insert_own_folder`, `photos_bucket_update_own_object`, and `photos_bucket_delete_own_object`. Owners may read their objects. Non-owner and anonymous reads require a matching `photos.storage_path` whose photo is public or shared. Mobile display must use signed reads. Storage upsert is not equivalent to insert: it requires `SELECT`, `INSERT`, and `UPDATE` permissions, so default uploads should remain insert-only unless replacement is intentional.

The original baseline dump did not reproduce the hosted `photos` bucket or its `storage.objects` policies. Local migration `20260825085451_restore_private_photo_storage_policies.sql` now creates the private bucket and restores those four observed policies without adding public access. A publishable-key round trip verifies owner upload and private read, anonymous/non-owner public signed reads, private signing and direct-download denial, signed URL expiry, and denial of newly requested URLs after a public row becomes private. Local DB lint and security/performance advisors report no issues. This local migration is not yet applied to the hosted project.

## OAuth And Auth

The existing web contract uses Google and Kakao through `signInWithOAuth`; Kakao adds its provider-specific mobile option while Google uses the default scopes. Local native configuration declares `ikkyee://auth/callback` and development redirects `exp://127.0.0.1:8081` and `http://localhost:8081`.

The custom scheme must be registered by the native application, added to Supabase's allowed redirects, and reflected in each provider console where applicable. Live provider enablement, provider application identifiers, and live redirect allow-list values were not available through the permitted read-only metadata tools, so they are explicitly unknown rather than inferred from local configuration. No Edge Functions are deployed or required by this client contract.

## Drift And Limits

The contracted live table policy names, commands, roles, RLS flags, and function security modes match `supabase/schema.sql`; `policyDrift.status` is `matched`. The baseline dump omitted the Storage-owned schema, so the observed Storage policies are reproduced by the later local migration above. Live migration history and repository migration history differ; this is recorded and requires reconciliation before any hosted deployment rather than being treated as proof of hosted drift.

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
