create table public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  blocked_display_name text not null default 'Ikkyee 여행자',
  created_at timestamp with time zone not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id),
  constraint user_blocks_display_name_length check (char_length(blocked_display_name) between 1 and 80)
);

create index user_blocks_blocked_id_idx on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;
revoke all on table public.user_blocks from anon, authenticated;
grant select, insert, delete on table public.user_blocks to authenticated;

create policy "user_blocks_select_own"
  on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "user_blocks_insert_own"
  on public.user_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "user_blocks_delete_own"
  on public.user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

create or replace function public.enforce_user_block_insert()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  target_name text;
begin
  if auth.uid() is null or new.blocker_id is distinct from auth.uid() or new.blocker_id = new.blocked_id then
    raise exception 'Invalid user block' using errcode = '42501';
  end if;

  select nullif(btrim(nickname), '')
  into target_name
  from public.profiles
  where id = new.blocked_id;

  if not found then
    raise exception 'Block target is unavailable' using errcode = '22023';
  end if;

  new.blocked_display_name := left(coalesce(target_name, 'Ikkyee 여행자'), 80);
  new.created_at := now();
  return new;
end;
$$;

revoke all on function public.enforce_user_block_insert() from public, anon, authenticated;
create trigger user_blocks_enforce_insert
  before insert on public.user_blocks
  for each row execute function public.enforce_user_block_insert();

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  photo_id text references public.photos(id) on delete set null,
  reason text not null,
  details text not null default '',
  status text not null default 'pending',
  created_at timestamp with time zone not null default now(),
  reviewed_at timestamp with time zone,
  constraint content_reports_no_self_report check (reporter_id <> reported_user_id),
  constraint content_reports_reason_check check (reason in ('spam', 'harassment', 'sensitive', 'copyright', 'other')),
  constraint content_reports_details_length check (char_length(details) <= 500),
  constraint content_reports_status_check check (status in ('pending', 'reviewing', 'actioned', 'dismissed'))
);

create index content_reports_reporter_created_idx on public.content_reports(reporter_id, created_at desc);
create index content_reports_status_created_idx on public.content_reports(status, created_at);
create unique index content_reports_pending_photo_unique
  on public.content_reports(reporter_id, photo_id)
  where status = 'pending' and photo_id is not null;
create unique index content_reports_pending_profile_unique
  on public.content_reports(reporter_id, reported_user_id)
  where status = 'pending' and photo_id is null;

alter table public.content_reports enable row level security;
revoke all on table public.content_reports from anon, authenticated;
grant select, insert on table public.content_reports to authenticated;

create policy "content_reports_select_own"
  on public.content_reports for select to authenticated
  using (reporter_id = (select auth.uid()));

create policy "content_reports_insert_own"
  on public.content_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

create or replace function public.enforce_content_report_submission()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or new.reporter_id is distinct from auth.uid() or new.reporter_id = new.reported_user_id then
    raise exception 'Invalid content report' using errcode = '42501';
  end if;

  new.details := left(btrim(coalesce(new.details, '')), 500);
  new.status := 'pending';
  new.created_at := now();
  new.reviewed_at := null;

  if new.photo_id is not null and not exists (
    select 1 from public.photos as reported_photo
    where reported_photo.id = new.photo_id
      and reported_photo.owner_id = new.reported_user_id
      and reported_photo.visibility = 'public'
  ) then
    raise exception 'Report target is unavailable' using errcode = '22023';
  end if;

  if (
    select count(*) from public.content_reports as existing_report
    where existing_report.reporter_id = auth.uid()
      and existing_report.created_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'Report rate limit exceeded' using errcode = '54000';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_content_report_submission() from public, anon, authenticated;
create trigger content_reports_enforce_submission
  before insert on public.content_reports
  for each row execute function public.enforce_content_report_submission();

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "profiles_select_anon"
  on public.profiles for select to anon using (true);
create policy "profiles_select_authenticated_unblocked"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or not exists (
      select 1 from public.user_blocks as viewer_block
      where viewer_block.blocker_id = (select auth.uid())
        and viewer_block.blocked_id = profiles.id
    )
  );

drop policy if exists "photos_select_owner_or_visible" on public.photos;
create policy "photos_select_owner_or_visible_anon"
  on public.photos for select to anon
  using (visibility in ('public', 'link') or shared is true);
create policy "photos_select_owner_or_visible"
  on public.photos for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (
      (visibility in ('public', 'link') or shared is true)
      and not exists (
        select 1 from public.user_blocks as viewer_block
        where viewer_block.blocker_id = (select auth.uid())
          and viewer_block.blocked_id = photos.owner_id
      )
    )
  );

drop policy if exists "comments_select_visible_photo" on public.comments;
create policy "comments_select_visible_photo_anon"
  on public.comments for select to anon
  using (
    exists (
      select 1 from public.photos as visible_photo
      where visible_photo.id = comments.photo_id
        and (visible_photo.visibility in ('public', 'link') or visible_photo.shared is true)
    )
  );
create policy "comments_select_visible_photo"
  on public.comments for select to authenticated
  using (
    exists (select 1 from public.photos as visible_photo where visible_photo.id = comments.photo_id)
    and not exists (
      select 1 from public.user_blocks as viewer_block
      where viewer_block.blocker_id = (select auth.uid())
        and viewer_block.blocked_id = comments.author_id
    )
  );
