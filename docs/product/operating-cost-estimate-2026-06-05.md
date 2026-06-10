# Travelgram / Ikkyee Operating Cost Estimate

Date: 2026-06-05

## Current Stack Assumption

- Frontend hosting: Cloudflare Pages.
- Auth, database, and current photo storage: Supabase project `ikkyee`.
- Cloudflare D1 is not currently used by local code.
- Cloudflare R2 bucket exists in the Cloudflare configuration, but current upload code still uses Supabase Storage.

## Pricing References Checked

- Supabase pricing: https://supabase.com/pricing
- Supabase storage pricing docs: https://supabase.com/docs/guides/storage/pricing
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare platform pricing: https://www.cloudflare.com/plans/

## Main Cost Drivers

For this website, user count alone is not the main cost driver. Cost grows mainly from:

1. Total stored photos.
2. Average stored size per photo.
3. Monthly image views/downloads.
4. Whether photo files stay in Supabase Storage or move to Cloudflare R2.
5. Authenticated monthly active users if the service exceeds Supabase Pro's included MAU.

Database metadata is likely cheaper than image storage and image traffic for a long time.

## Baseline Assumptions

Use these estimates for first-pass planning:

- Optimized photo size: 1 MB per stored photo.
- Unoptimized/original-heavy photo size: 4 MB per stored photo.
- Feed/grid image view: about 0.3 MB per image view.
- Detail image view: about 1 MB per image view.
- First cost estimate below assumes optimized photos and mostly grid/detail mixed traffic at about 0.3 MB per view.

If original photos are stored at 4 MB each, storage cost and storage quota usage are roughly 4x higher.

## Supabase-Based Estimate

Supabase Pro reference:

- Base plan: $25/month.
- 100,000 monthly active users included, then $0.00325 per MAU.
- 8 GB database disk included, then $0.125 per GB.
- 100 GB file storage included, then about $0.0213 per GB.
- 250 GB egress/cached egress included, then overage depends on cached vs uncached traffic.

| Scenario | Users | Photos/user | Total photos | Stored size at 1 MB/photo | Monthly image views | Est. monthly cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Small beta | 100 | 100 | 10,000 | 10 GB | 10,000 | About $25 |
| Early service | 1,000 | 300 | 300,000 | 300 GB | 500,000 | About $29-$40 |
| Growing service | 10,000 | 500 | 5,000,000 | 5 TB | 5,000,000 | About $165-$245 |
| Large public service | 100,000 | 300 | 30,000,000 | 30 TB | 30,000,000 | About $925-$1,450 |

Notes:

- These are rough monthly estimates, not invoices.
- Public Explore traffic can raise egress quickly if many people browse public albums.
- If images are not compressed and average 4 MB/photo, the 10,000-user scenario could move from about 5 TB stored to about 20 TB stored.
- If MAU exceeds 100,000 on Supabase Pro, add $0.00325 per extra active user.

## Cloudflare R2 Photo Storage Alternative

Cloudflare R2 Standard reference:

- 10 GB-month free.
- Storage after free tier: $0.015 per GB-month.
- Class A operations: 1 million free, then $4.50 per million.
- Class B operations: 10 million free, then $0.36 per million.
- R2 has no egress fee for standard data retrieval, but requests still matter.

Approximate R2 storage-only comparison:

| Stored photos | Stored size at 1 MB/photo | R2 storage/month | Read request estimate |
| ---: | ---: | ---: | ---: |
| 10,000 | 10 GB | $0 | Usually $0 |
| 300,000 | 300 GB | About $4.35 | Usually $0 if under 10M reads |
| 5,000,000 | 5 TB | About $74.85 | About $0 if under 10M reads |
| 30,000,000 | 30 TB | About $449.85 | About $7.20 for 30M reads |

R2 is likely much cheaper for photo-heavy growth, especially when public image views increase. Supabase can still remain useful for Auth and Postgres metadata while photos move to R2.

## Recommendation

MVP:

- Keep Supabase Auth and database.
- Keep Supabase Storage only while usage is small and development speed matters.
- Add image compression and avoid storing full original photos unless explicitly needed.
- Track per-user total storage and photo count from the beginning.

Before public beta:

- Decide whether private photos should move to private storage.
- Add quotas: free user photo limit, max upload size, and monthly upload limit.
- Add admin metrics for storage, egress, public photo count, and missing-location queue.

When usage grows:

- Move photo files to Cloudflare R2.
- Keep metadata in Supabase or evaluate Cloudflare D1 only if the project intentionally moves away from Supabase Auth/Postgres.
- Use thumbnails/detail sizes to reduce traffic; do not serve originals in grids.

