alter table public.profiles
  add column if not exists cover_path text not null default '';

alter table public.profiles
  add constraint profiles_cover_path_check
    check (
      cover_path = ''
      or cover_path ~ (
        '^' || id::text || '/cover-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
      )
    ) not valid;

create or replace function public.enforce_mobile_profile_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.nickname := btrim(new.nickname);
  new.bio := btrim(coalesce(new.bio, ''));
  new.avatar_path := btrim(coalesce(new.avatar_path, ''));
  new.cover_path := btrim(coalesce(new.cover_path, ''));

  if char_length(new.nickname) not between 1 and 40 then
    raise exception using errcode = '22023', message = 'invalid profile nickname';
  end if;
  if char_length(new.bio) > 300 then
    raise exception using errcode = '22023', message = 'invalid profile bio';
  end if;
  if new.avatar_path <> '' and new.avatar_path !~ (
    '^' || new.id::text || '/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$'
  ) then
    raise exception using errcode = '22023', message = 'invalid profile avatar path';
  end if;
  if new.cover_path <> '' and new.cover_path !~ (
    '^' || new.id::text || '/cover-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  ) then
    raise exception using errcode = '22023', message = 'invalid profile cover path';
  end if;
  return new;
end;
$$;

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'avatars';

drop policy if exists "profile_cover_owner_insert" on storage.objects;
create policy "profile_cover_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and array_length(storage.foldername(name), 1) = 1
  and storage.filename(name) ~ '^cover-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  and storage.extension(name) in ('jpg', 'png', 'webp')
);

comment on column public.profiles.cover_path is
  'Owner-scoped profile cover object path in the public avatars bucket.';
