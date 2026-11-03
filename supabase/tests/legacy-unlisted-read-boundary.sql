-- prelaunch-atomic-quota.sql의 임시 자료 생성 이후, 같은 롤백 트랜잭션에서 실행한다.
update public.photos set visibility = 'link', shared = true where id = 'qa-a-' || current_setting('ikkyee.qa_actor');
update public.albums set visibility = 'link' where id = current_setting('ikkyee.qa_album')::uuid;
select set_config('request.jwt.claims', json_build_object('sub',current_setting('ikkyee.qa_actor'),'role','authenticated')::text, true);
set local role authenticated;
do $$ begin
  if not exists(select 1 from public.photos where id = 'qa-a-' || current_setting('ikkyee.qa_actor'))
    or not exists(select 1 from public.albums where id = current_setting('ikkyee.qa_album')::uuid) then
    raise exception 'FAIL: owner lost legacy content';
  end if;
end; $$;
reset role;
select set_config('request.jwt.claims', json_build_object('sub',current_setting('ikkyee.qa_other'),'role','authenticated')::text, true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.photos where id = 'qa-a-' || current_setting('ikkyee.qa_actor'))
    or exists(select 1 from public.albums where id = current_setting('ikkyee.qa_album')::uuid) then
    raise exception 'FAIL: another account can list legacy link content';
  end if;
  begin
    perform public.set_photo_like('qa-a-' || current_setting('ikkyee.qa_actor'), true);
    raise exception 'FAIL: another account can like legacy link content';
  exception when insufficient_privilege then null;
  end;
end; $$;
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$ begin
  if exists(select 1 from public.photos where id = 'qa-a-' || current_setting('ikkyee.qa_actor'))
    or exists(select 1 from public.albums where id = current_setting('ikkyee.qa_album')::uuid) then
    raise exception 'FAIL: anonymous visitor can list legacy link content';
  end if;
  if not exists(select 1 from public.photos where id = 'qa-other-' || current_setting('ikkyee.qa_actor')) then
    raise exception 'FAIL: public photo disappeared';
  end if;
end; $$;
reset role;
