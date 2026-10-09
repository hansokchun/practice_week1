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
  if tg_op = 'INSERT' and photo_count >= 100
    and viewer_id <> 'c46ae404-a8b3-4a13-8722-65b2f9d20c35'::uuid then
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

alter table public.landing_hero_photos
  drop constraint landing_hero_photos_sort_order_check,
  add constraint landing_hero_photos_sort_order_check check (sort_order between 0 and 6);
