-- 앨범 연결 저장: 호출자 RLS를 유지하고 중간 실패 시 전체를 되돌린다.
create or replace function public.mutate_album_photos(
  target_album_id uuid, selected_photo_ids text[], mutation_mode text default 'replace'
)
returns setof public.album_photos
language plpgsql security invoker set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  desired_ids text[];
  locked_count integer;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if mutation_mode is null or mutation_mode not in ('append', 'replace')
    or selected_photo_ids is null or cardinality(selected_photo_ids) > 5000 then
    raise exception 'Invalid album selection' using errcode = '22023';
  end if;
  -- 같은 사용자의 여러 앨범 편집을 직렬화하고 삭제/갱신 중 부분 저장을 막는다.
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 73031));
  perform 1 from public.albums where id = target_album_id and owner_id = actor for update;
  if not found then raise exception 'Album not available' using errcode = '42501'; end if;
  select coalesce(array_agg(id order by first_position), '{}'::text[]) into desired_ids
    from (select id, min(position) first_position
      from unnest(selected_photo_ids) with ordinality as requested(id, position)
      group by id) normalized;
  if array_position(desired_ids, null) is not null or array_position(desired_ids, '') is not null then
    raise exception 'Invalid photo id' using errcode = '22023';
  end if;
  if mutation_mode = 'append' then
    select coalesce(array_agg(id order by first_position), '{}'::text[]) into desired_ids
    from (select id, min(position) first_position from unnest(
      coalesce((select array_agg(ap.photo_id order by ap.sort_order, ap.photo_id)
        from public.album_photos ap where ap.album_id = target_album_id), '{}'::text[])
      || desired_ids) with ordinality as requested(id, position) group by id) normalized;
  end if;
  -- 공개된 타인의 사진도 앨범에 넣을 수 없도록 RLS와 별도로 소유권을 검증한다.
  perform 1 from public.photos p where p.id = any(desired_ids) and p.owner_id = actor order by p.id for update;
  get diagnostics locked_count = row_count;
  if locked_count <> cardinality(desired_ids) then
    raise exception 'Photo not available' using errcode = '42501';
  end if;
  delete from public.album_photos ap where ap.album_id = target_album_id and not (ap.photo_id = any(desired_ids));
  update public.photos set album_id = null, album = null
    where album_id = target_album_id and owner_id = actor and not (id = any(desired_ids));
  insert into public.album_photos(album_id, photo_id, sort_order)
    select target_album_id, id, (position - 1)::integer
    from unnest(desired_ids) with ordinality as requested(id, position)
    on conflict (album_id, photo_id) do update set sort_order = excluded.sort_order;
  update public.photos set album_id = target_album_id where id = any(desired_ids) and owner_id = actor;
  update public.albums set photo_count = cardinality(desired_ids) where id = target_album_id and owner_id = actor;
  return query select ap.* from public.album_photos ap where ap.album_id = target_album_id order by ap.sort_order, ap.photo_id;
end;
$$;
revoke all on function public.mutate_album_photos(uuid, text[], text) from public, anon;
grant execute on function public.mutate_album_photos(uuid, text[], text) to authenticated;

-- 사진의 삭제·분석 상태/시각 변경으로 초기화할 수 없는 사용자별 UTC 일일 원장.
create table private.photo_ai_daily_usage (
  owner_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null,
  attempts integer not null check (attempts between 1 and 30),
  primary key (owner_id, usage_day)
);
alter table private.photo_ai_daily_usage enable row level security;
revoke all on private.photo_ai_daily_usage from public, anon, authenticated;

-- 전환 시점 당일의 기존 분석을 한도에 포함한다. 새 원장은 사진과 분리되어 유지된다.
insert into private.photo_ai_daily_usage(owner_id, usage_day, attempts)
  select owner_id, (statement_timestamp() at time zone 'UTC')::date, least(count(*)::integer, 30)
  from public.photos where owner_id is not null
    and ai_analyzed_at >= date_trunc('day', statement_timestamp() at time zone 'UTC') at time zone 'UTC'
  group by owner_id;

create or replace function private.enforce_photo_ai_daily_quota()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  charged integer;
begin
  if new.ai_analysis_status is distinct from 'processing' or actor is null then return new; end if;
  if new.owner_id is distinct from actor then raise exception 'Photo not available' using errcode = '42501'; end if;
  -- UPSERT의 행 잠금이 서로 다른 사진의 동시 분석에도 사용자별 30회 상한을 보장한다.
  insert into private.photo_ai_daily_usage as usage(owner_id, usage_day, attempts)
    values(actor, (statement_timestamp() at time zone 'UTC')::date, 1)
    on conflict (owner_id, usage_day) do update set attempts = usage.attempts + 1
    where usage.attempts < 30 returning attempts into charged;
  if charged is null then raise exception 'photo_ai_daily_limit' using errcode = 'P0001'; end if;
  new.ai_analyzed_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.enforce_photo_ai_daily_quota() from public, anon, authenticated;
create trigger enforce_photo_ai_daily_quota
before insert or update of ai_analysis_status, ai_analyzed_at on public.photos
for each row execute function private.enforce_photo_ai_daily_quota();
