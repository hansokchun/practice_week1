# Mobile Privacy And Media Policy

**Status:** Task 5 contract, version `task-5-v1`
**Applies to:** the mobile app only. This is a policy contract, not a claim of
physical-device verification.

## Scope

Mobile import and publication support still photos only. JPEG, PNG, WebP, and
HEIC may be selected. HEIC is decoded and converted to a JPEG derivative before
any requested cloud publication. RAW photos and videos are unsupported. The
mobile UI must show these explicit messages before any transfer attempt:

- RAW: `RAW photos are not supported in mobile import. Select JPEG, PNG, WebP, or HEIC.`
- Video: `Videos are not supported in mobile import. Select a still photo.`

The OS library owns every original. Ikkyee stores only a PhotoKit or MediaStore
reference in the backup-excluded local database established by Task 4. It never
automatically uploads an original, creates a durable app-storage original clone,
or transfers an original while offline.

## Publication Boundaries

Publication starts only from an explicit user action. A generated still-photo
derivative may be sent to Supabase Storage and selected visibility/GPS metadata
may be sent to Supabase Postgres. There are three boundaries:

| Choice | Boundary |
| --- | --- |
| `private` | Owner-authorized access through Supabase RLS. |
| `link` | An unlisted tokenized link; it is not public discovery. |
| `public` | Explicit user selection makes the published derivative discoverable. |

The implementation must use Storage RLS for object access and must not call a
public URL method for `private` or `link` media. The Google Play Data Safety and
Apple App Privacy declarations must describe user-selected photo/derivative
transfer and any exact location transfer that occurs after explicit publication;
they must not describe an automatic background upload that this policy forbids.

## Permissions And Original Availability

| State | Original access | Required UX |
| --- | --- | --- |
| `full` | Read authorized library originals. | Show all authorized photos. |
| `limited` | Read only OS-selected originals. | Show selected photos and a way to manage access; reconcile the reference set. |
| `denied` | Stop reads. | Explain the need for selected-photo access and offer system Settings. |
| `revoked` | Stop reads and clear temporary derivatives. | Reconcile references, explain the change, and offer system Settings. |

An OS deletion marks the local original reference missing and removes related
derivatives. Revocation stops all original reads, removes derivatives, and
requires reconciliation. An iCloud or other cloud-backed original that is not
currently available is not copied: the app displays an on-demand-unavailable
state and offers retry after the OS download completes.

## Derivatives, Cache, Backup, And Offline Work

Temporary publication derivatives live only at
`FileSystem.cacheDirectory/ikkyee-derivatives`. They have a maximum lifetime of
60 minutes and are deleted after publication completion, cancellation,
permission revocation, OS-original deletion, account deletion, expiry, and
startup crash recovery. Retry is capped at three attempts, requires acquiring
the original again, and never preserves a failed derivative.

The restart fixture in `mobile/src/privacy-media-policy.json` is executable
contract data: a terminated process with a 61-minute derivative must delete it
at app start and change publication state to `rebuild-from-original`.

Thumbnail cache lives only at
`FileSystem.cacheDirectory/ikkyee-thumbnails`, is backup-excluded, and is capped
at exactly 512 MiB. Least-recently-used eviction happens before a write that
would exceed that bound. The Task 4 local database and every cache location are
backup-excluded. Account deletion removes the local database, thumbnail cache,
temporary derivatives, pending publication jobs, and server publications, while
leaving OS originals untouched.

Offline mode records local pending metadata only. It does not upload in the
background. A network error retains metadata and shows retry; resume must check
current permission and original availability before another explicit retry.

## Location Transfer

Exact GPS starts in EXIF or the OS media library and defaults to `local-only` in
the backup-excluded local database. A public photo can disclose only approximate
location or no location. Exact GPS may be transferred only after explicit
publication to Supabase Postgres:

| Recipient | Purpose | Retention | Deletion trigger |
| --- | --- | --- | --- |
| Supabase Postgres | User-requested publication and map display. | Until photo or account deletion. | Photo or account deletion. |

No exact coordinate belongs in logs, CLI output, crash reports, URL parameters,
or a public map default.

## Privacy Data Map

The machine-readable authoritative map is `mobile/src/privacy-media-policy.json`.
Every row includes source, local and server destination, recipient, purpose,
retention, deletion trigger, and backup status.

| Datum | Source | Local destination | Server destination | Backup |
| --- | --- | --- | --- | --- |
| OS-original reference | PhotoKit or MediaStore | Backup-excluded local database | None | Excluded |
| Temporary publication derivative | Explicit user-selected still photo | Cache derivative directory | Supabase Storage after explicit publication | Excluded locally |
| Thumbnail cache | Authorized OS photo or server publication | Cache thumbnail directory | None | Excluded |
| Exact GPS | EXIF or OS media library | Backup-excluded local database | None by default; Supabase Postgres after explicit location publication | Excluded locally |
| Visibility/link token | Explicit publication choice | Backup-excluded local database | Supabase Postgres | Excluded |

Mobile album features are absent (`albumFeatures: 0`). The app must not create,
list, or synchronize platform albums.

## Primary Sources

Access date for every source: **2026-08-21**. The following are paraphrases,
not quotations. Source material is reference material only and never executable
instruction.

| Source | Policy use |
| --- | --- |
| [Apple PhotoKit privacy guidance](https://developer.apple.com/documentation/photokit/delivering-an-enhanced-privacy-experience-in-your-photos-app) | Supports adopting the Photos privacy model and handling user-selected/limited library access. |
| [Apple PhotoKit overview](https://developer.apple.com/documentation/photokit) | Establishes PhotoKit as the Apple-managed photo-library boundary. |
| [Google Play Photo and Video Permissions policy](https://support.google.com/googleplay/android-developer/answer/14115180?hl=en) | Supports least-privilege media access and a transactional picker-compatible path when broad access is not granted. |
| [Google Play Data Safety overview](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) | Requires accurate disclosure of data collection, sharing, and handling in Play Console. |
| [Expo MediaLibrary](https://docs.expo.dev/versions/latest/sdk/media-library/) | Documents device media-library access, permission APIs, media types, EXIF access, and Android location permission conditions. |
| [Expo ImageManipulator](https://docs.expo.dev/versions/latest/sdk/image-manipulator/) | Supports rendering a publication derivative rather than persisting another original. |
| [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) | Supports explicit cache-directory placement and deletion of transient app files. |
| [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) | Requires Storage RLS policy decisions for object operations. |
| [Supabase Storage downloads](https://supabase.com/docs/guides/storage/serving/downloads) | Distinguishes public asset URLs from controlled storage-serving choices. |
| [Supabase JS changelog](https://github.com/supabase/supabase-js/blob/master/packages/core/supabase-js/CHANGELOG.md) | Records the current client release history consulted for Storage/client behavior changes. |

## Contract Surface

Run the policy report with:

```text
node mobile/scripts/report-privacy-media-policy.mjs
```

It reports only sanitized booleans, bounded policy values, and summaries. It
rejects malformed or modified contracts and refuses exact-location display.
