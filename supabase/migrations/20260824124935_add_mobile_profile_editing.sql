alter table public.profiles
  add column if not exists avatar_path text not null default '';

alter table public.profiles
  add constraint profiles_mobile_nickname_length_check
    check (char_length(btrim(nickname)) between 1 and 40) not valid,
  add constraint profiles_mobile_bio_length_check
    check (char_length(bio) <= 300) not valid,
  add constraint profiles_mobile_avatar_path_check
    check (
      avatar_path = ''
      or avatar_path ~ (
        '^' || id::text || '/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$'
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
  return new;
end;
$$;

revoke all on function public.enforce_mobile_profile_fields() from public, anon, authenticated;

drop trigger if exists profiles_enforce_mobile_fields on public.profiles;
create trigger profiles_enforce_mobile_fields
before insert or update on public.profiles
for each row execute function public.enforce_mobile_profile_fields();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg']::text[])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "mobile_avatar_owner_insert" on storage.objects;
create policy "mobile_avatar_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and array_length(storage.foldername(name), 1) = 1
  and storage.filename(name) ~ '^avatar-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$'
  and storage.extension(name) = 'jpg'
);

drop policy if exists "mobile_avatar_owner_select" on storage.objects;
create policy "mobile_avatar_owner_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
);

drop policy if exists "mobile_avatar_owner_delete" on storage.objects;
create policy "mobile_avatar_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

comment on column public.profiles.avatar_path is
  'Canonical mobile avatar object path in the public avatars bucket. Legacy avatar_url remains for web/provider compatibility.';
