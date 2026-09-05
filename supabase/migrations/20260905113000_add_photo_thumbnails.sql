alter table public.photos
    add column if not exists thumbnail_path text;

comment on column public.photos.thumbnail_path is
    'Private Storage object path for the lightweight web thumbnail. The original remains in storage_path.';

create index if not exists photos_thumbnail_path_idx
    on public.photos (thumbnail_path)
    where thumbnail_path is not null;

drop policy if exists photos_bucket_select_owned_or_public_photo on storage.objects;

create policy photos_bucket_select_owned_or_public_photo
on storage.objects
for select
to public
using (
    bucket_id = 'photos'
    and (
        owner_id = (select auth.uid())::text
        or exists (
            select 1
            from public.photos p
            where (p.storage_path = objects.name or p.thumbnail_path = objects.name)
              and (p.visibility = 'public' or p.shared is true)
        )
    )
);
