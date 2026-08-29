insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do update
set public = false;

drop policy if exists "photos_bucket_select_owned_or_public_photo" on storage.objects;
create policy "photos_bucket_select_owned_or_public_photo"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'photos'
  and (
    owner_id = (select auth.uid()::text)
    or exists (
      select 1
      from public.photos as visible_photo
      where visible_photo.storage_path = storage.objects.name
        and (
          visible_photo.owner_id = (select auth.uid())
          or visible_photo.visibility = 'public'
          or visible_photo.shared is true
        )
    )
  )
);

drop policy if exists "photos_bucket_insert_own_folder" on storage.objects;
create policy "photos_bucket_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'photos'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "photos_bucket_update_own_object" on storage.objects;
create policy "photos_bucket_update_own_object"
on storage.objects for update
to authenticated
using (
  bucket_id = 'photos'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'photos'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "photos_bucket_delete_own_object" on storage.objects;
create policy "photos_bucket_delete_own_object"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'photos'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
