create schema if not exists private;

create or replace function private.delete_unused_landing_upload(target_photo_id text)
returns table (id text, storage_path text, thumbnail_path text, preview_path text)
language plpgsql security definer set search_path = '' as $$
declare
    candidate public.photos%rowtype;
begin
    if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin' then
        raise exception 'Administrator access required' using errcode = '42501';
    end if;
    select p.* into candidate from public.photos p
    where p.id = target_photo_id and p.owner_id = auth.uid()
      and p.storage_path like p.owner_id::text || '/landing/%'
    for update;
    if not found then return; end if;
    if candidate.album_id is not null
      or exists (select 1 from public.landing_hero_photos h where h.photo_id = candidate.id)
      or exists (select 1 from public.landing_section_photos s where s.photo_id = candidate.id)
      or exists (select 1 from public.album_photos a where a.photo_id = candidate.id)
      or exists (select 1 from public.albums a where a.cover_url = candidate.url
                 or position(candidate.storage_path in a.cover_url) > 0) then
        return;
    end if;
    return query delete from public.photos p where p.id = candidate.id
        returning p.id, p.storage_path, p.thumbnail_path, p.preview_path;
end;
$$;

revoke all on function private.delete_unused_landing_upload(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.delete_unused_landing_upload(text) to authenticated;

create or replace function public.delete_unused_landing_upload(target_photo_id text)
returns table (id text, storage_path text, thumbnail_path text, preview_path text)
language sql security invoker set search_path = '' as $$
    select * from private.delete_unused_landing_upload(target_photo_id);
$$;
revoke all on function public.delete_unused_landing_upload(text) from public, anon;
grant execute on function public.delete_unused_landing_upload(text) to authenticated;
