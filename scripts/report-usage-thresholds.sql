-- Aggregate-only operational snapshot. Do not add user identifiers or object paths.
with photo_storage as (
  select
    count(*)::bigint as storage_objects,
    coalesce(sum((metadata ->> 'size')::bigint), 0)::bigint as storage_bytes
  from storage.objects
  where bucket_id = 'photos'
), product_counts as (
  select
    (select count(*) from auth.users)::bigint as auth_users,
    (select count(*) from public.photos)::bigint as photos,
    (select count(*) from public.photos where visibility = 'public')::bigint as public_photos,
    (select count(*) from public.albums)::bigint as albums,
    (select count(*) from public.user_likes)::bigint as likes,
    (select count(*) from public.comments)::bigint as comments
)
select
  current_date as snapshot_date,
  product_counts.auth_users,
  product_counts.photos,
  product_counts.public_photos,
  product_counts.albums,
  product_counts.likes,
  product_counts.comments,
  photo_storage.storage_objects,
  photo_storage.storage_bytes,
  round(photo_storage.storage_bytes / 1073741824.0, 3) as storage_gib,
  case
    when photo_storage.storage_bytes = 0 or product_counts.photos = 0 then 0
    else round(photo_storage.storage_bytes::numeric / product_counts.photos)
  end as average_bytes_per_photo
from photo_storage
cross join product_counts;
