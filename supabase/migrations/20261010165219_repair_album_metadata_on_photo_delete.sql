create or replace function private.repair_albums_before_photo_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  remaining_count integer;
  replacement_cover text;
begin
  for target in
    select a.id, a.cover_url,
      (a.cover_url = old.url or exists (
        select 1 from unnest(array[old.storage_path, old.thumbnail_path, old.preview_path]) as path(value)
        where nullif(path.value, '') is not null and position(path.value in coalesce(a.cover_url, '')) > 0
      )) as deleted_cover
    from public.albums a
    where a.id = old.album_id
      or exists (select 1 from public.album_photos ap where ap.album_id = a.id and ap.photo_id = old.id)
      or a.cover_url = old.url
      or exists (
        select 1 from unnest(array[old.storage_path, old.thumbnail_path, old.preview_path]) as path(value)
        where nullif(path.value, '') is not null and position(path.value in coalesce(a.cover_url, '')) > 0
      )
    order by a.id
    for update of a
  loop
    select count(*)::integer,
      (array_agg(p.url order by p.date nulls last, p.created_at, p.id))[1]
    into remaining_count, replacement_cover
    from public.photos p
    where p.id <> old.id and (
      p.album_id = target.id
      or exists (select 1 from public.album_photos ap where ap.album_id = target.id and ap.photo_id = p.id)
    );
    update public.albums
    set photo_count = remaining_count,
      cover_url = case when target.deleted_cover then replacement_cover else target.cover_url end
    where id = target.id;
  end loop;
  return old;
end;
$$;

revoke all on function private.repair_albums_before_photo_delete() from public, anon, authenticated;

create trigger photos_repair_album_metadata_before_delete
before delete on public.photos
for each row execute function private.repair_albums_before_photo_delete();
