-- 이 파일은 BEGIN ... ROLLBACK 안에서만 실행한다. 실제 계정/사진을 사용하지 않는다.
select set_config('ikkyee.qa_actor', gen_random_uuid()::text, true);
select set_config('ikkyee.qa_other', gen_random_uuid()::text, true);
select set_config('ikkyee.qa_album', gen_random_uuid()::text, true);
insert into auth.users(id, email, created_at)
values(current_setting('ikkyee.qa_actor')::uuid, 'qa' || left(current_setting('ikkyee.qa_actor'), 8) || '@example.invalid', now()),
      (current_setting('ikkyee.qa_other')::uuid, 'qa' || left(current_setting('ikkyee.qa_other'), 8) || '@example.invalid', now());
insert into public.albums(id, owner_id, title)
values(current_setting('ikkyee.qa_album')::uuid, current_setting('ikkyee.qa_actor')::uuid, '검증 전용');
insert into public.photos(id, owner_id, visibility, shared)
values('qa-a-' || current_setting('ikkyee.qa_actor'), current_setting('ikkyee.qa_actor')::uuid, 'private', false),
      ('qa-b-' || current_setting('ikkyee.qa_actor'), current_setting('ikkyee.qa_actor')::uuid, 'private', false),
      ('qa-other-' || current_setting('ikkyee.qa_actor'), current_setting('ikkyee.qa_other')::uuid, 'public', true);
-- 연결 삭제 후 마지막 사진 갱신을 실패시켜 전체 원자성을 검증한다.
create function private.qa_fail_album_write() returns trigger language plpgsql as $$
begin
  if new.id = 'qa-b-' || current_setting('ikkyee.qa_actor', true)
    and new.album_id is not null and current_setting('ikkyee.qa_fail', true) = 'yes' then
    raise exception 'qa_injected_album_failure';
  end if;
  return new;
end; $$;
create trigger qa_fail_album_write before update of album_id on public.photos
for each row execute function private.qa_fail_album_write();
select set_config('request.jwt.claims', json_build_object('sub',current_setting('ikkyee.qa_actor'),'role','authenticated')::text, true);
set local role authenticated;
do $$
declare
  actor text := current_setting('ikkyee.qa_actor');
  target_id uuid := current_setting('ikkyee.qa_album')::uuid;
begin
  perform public.mutate_album_photos(target_id, array['qa-a-' || actor], 'replace');
  begin
    perform public.mutate_album_photos(target_id, array['qa-other-' || actor], 'replace');
    raise exception 'FAIL: foreign public photo accepted';
  exception when insufficient_privilege then null;
  end;
  if not exists(select 1 from public.album_photos ap where ap.album_id = target_id and ap.photo_id = 'qa-a-' || actor) then
    raise exception 'FAIL: failed replacement changed original album';
  end if;
  perform set_config('ikkyee.qa_fail', 'yes', true);
  begin
    perform public.mutate_album_photos(target_id, array['qa-b-' || actor], 'replace');
    raise exception 'FAIL: injected error not reached';
  exception when raise_exception then
    if sqlerrm <> 'qa_injected_album_failure' then raise; end if;
  end;
  if not exists(select 1 from public.album_photos ap where ap.album_id = target_id and ap.photo_id = 'qa-a-' || actor)
    or exists(select 1 from public.album_photos ap where ap.album_id = target_id and ap.photo_id = 'qa-b-' || actor)
    or (select album_id from public.photos where id = 'qa-a-' || actor) is distinct from target_id then
    raise exception 'FAIL: intermediate error left a partial write';
  end if;
  perform set_config('ikkyee.qa_fail', 'no', true);
  perform public.mutate_album_photos(target_id, array['qa-b-' || actor], 'append');
  if (select photo_count from public.albums where id = target_id) <> 2 then raise exception 'FAIL: append lost photo'; end if;
  perform public.mutate_album_photos(target_id, '{}'::text[], 'replace');
  if exists(select 1 from public.album_photos ap where ap.album_id = target_id)
    or exists(select 1 from public.photos p where p.album_id = target_id) then raise exception 'FAIL: clear incomplete'; end if;
  -- 상태/시각을 되돌려도 비공개 원장의 소비량은 줄어들지 않아야 한다.
  for i in 1..30 loop
    update public.photos set ai_analysis_status = 'processing', ai_analyzed_at = '2000-01-01' where id = 'qa-a-' || actor;
    update public.photos set ai_analysis_status = 'pending', ai_analyzed_at = null where id = 'qa-a-' || actor;
  end loop;
  begin
    update public.photos set ai_analysis_status = 'processing' where id = 'qa-b-' || actor;
    raise exception 'FAIL: 31st analysis accepted';
  exception when raise_exception then
    if sqlerrm <> 'photo_ai_daily_limit' then raise; end if;
  end;
  begin
    delete from private.photo_ai_daily_usage;
    raise exception 'FAIL: client changed quota ledger';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
do $$ begin
  if (select attempts from private.photo_ai_daily_usage where owner_id = current_setting('ikkyee.qa_actor')::uuid) <> 30 then
    raise exception 'FAIL: quota count did not persist across resets';
  end if;
end; $$;
