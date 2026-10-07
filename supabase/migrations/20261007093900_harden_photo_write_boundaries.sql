-- Keep the atomic RPC as the only client write boundary for likes.
revoke insert, update, delete, truncate, references, trigger on public.user_likes from public, anon, authenticated;

create or replace function public.protect_photo_like_count()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.liked := 0;
    else new.liked := old.liked;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_photo_like_count() from public, anon, authenticated;
create trigger protect_photo_like_count
before insert or update on public.photos
for each row execute function public.protect_photo_like_count();

create or replace function public.set_photo_like(target_photo_id text, should_like boolean)
returns integer language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  new_like_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform 1 from public.photos p
  where p.id = target_photo_id
    and (p.owner_id = current_user_id or p.visibility in ('public', 'link') or p.shared is true)
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = current_user_id and b.blocked_id = p.owner_id
    )
  for update;
  if not found then
    raise exception 'Photo is not available' using errcode = '42501';
  end if;
  if should_like then
    insert into public.user_likes(user_id, photo_id) values(current_user_id, target_photo_id)
    on conflict (user_id, photo_id) do nothing;
  else
    delete from public.user_likes where photo_id = target_photo_id and user_id = current_user_id;
  end if;
  select count(*)::integer into new_like_count from public.user_likes where photo_id = target_photo_id;
  update public.photos set liked = new_like_count where id = target_photo_id;
  return new_like_count;
end;
$$;
revoke all on function public.set_photo_like(text, boolean) from public, anon;
grant execute on function public.set_photo_like(text, boolean) to authenticated, service_role;

-- Match the current web account limits at the database boundary.
create or replace function public.enforce_photo_upload_limits()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  viewer_id uuid := auth.uid();
  account_created_at timestamptz;
  photo_count integer;
  today_count integer;
  public_count integer;
  becoming_public boolean;
begin
  if current_setting('role', true) <> 'authenticated' then return new; end if;
  if viewer_id is null or new.owner_id is distinct from viewer_id then
    raise exception 'Photo owner must match the authenticated user' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('photo-upload:' || viewer_id::text, 0));
  -- UPSERT executes BEFORE INSERT even when it will update an existing row.
  if tg_op = 'INSERT' and exists (
    select 1 from public.photos where id = new.id and owner_id = viewer_id
  ) then return new; end if;
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    becoming_public := (new.visibility = 'public' or new.shared is true)
      and not (old.visibility = 'public' or old.shared is true);
    if not becoming_public then return new; end if;
  else
    new.created_at := now();
    becoming_public := new.visibility = 'public' or new.shared is true;
  end if;
  select count(*)::integer,
    count(*) filter (where created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC')::integer,
    count(*) filter (where visibility = 'public' or shared is true)::integer
  into photo_count, today_count, public_count
  from public.photos where owner_id = viewer_id and id <> new.id;
  if tg_op = 'INSERT' and photo_count >= 100 then
    raise exception 'Account photo limit reached (100)' using errcode = '23514';
  end if;
  select created_at into account_created_at from auth.users where id = viewer_id;
  if account_created_at > now() - interval '7 days' then
    if tg_op = 'INSERT' and today_count >= 20 then
      raise exception 'New account daily upload limit reached (20)' using errcode = '23514';
    end if;
    if becoming_public and public_count >= 5 then
      raise exception 'New account public photo limit reached (5)' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_photo_upload_limits() from public, anon, authenticated;
create trigger enforce_photo_upload_limits
before insert or update on public.photos
for each row when (current_user = 'authenticated')
execute function public.enforce_photo_upload_limits();

update storage.buckets
set file_size_limit = 15728640,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'photos';
