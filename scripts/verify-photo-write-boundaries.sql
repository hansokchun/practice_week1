-- Run on a disposable database or inside a transaction; never retain fixtures.
begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('e1ffca11-0000-4000-8000-000000000001','authenticated','authenticated','audit-old@example.invalid','{}','{}',now()-interval '30 days',now()),
('e1ffca11-0000-4000-8000-000000000002','authenticated','authenticated','audit-daily@example.invalid','{}','{}',now(),now()),
('e1ffca11-0000-4000-8000-000000000003','authenticated','authenticated','audit-public@example.invalid','{}','{}',now(),now());
insert into public.photos(id,owner_id,visibility,shared,created_at)
select 'audit-old-'||n,'e1ffca11-0000-4000-8000-000000000001','private',false,now() from generate_series(1,100)n;
insert into public.photos(id,owner_id,visibility,shared,created_at)
select 'audit-daily-'||n,'e1ffca11-0000-4000-8000-000000000002','private',false,now() from generate_series(1,20)n;
insert into public.photos(id,owner_id,visibility,shared,created_at)
select 'audit-public-'||n,'e1ffca11-0000-4000-8000-000000000003','public',true,now() from generate_series(1,5)n;
select set_config('request.jwt.claim.sub','e1ffca11-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$
begin
  if public.set_photo_like('audit-public-1',true) <> 1 then raise exception 'RPC like count failed'; end if;
  if public.set_photo_like('audit-public-1',true) <> 1 then raise exception 'RPC idempotence failed'; end if;
  if public.set_photo_like('audit-public-1',false) <> 0 then raise exception 'RPC unlike failed'; end if;
  begin
    insert into public.user_likes(user_id,photo_id) values(auth.uid(),'audit-public-1');
    raise exception 'Direct likes bypass allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.photos(id,owner_id,visibility,shared,created_at) values('audit-over-daily',auth.uid(),'private',false,now()-interval '1 year');
    raise exception 'Daily quota bypass allowed';
  exception when check_violation then null;
  end;
  update public.photos set liked=999,description='metadata edit' where id='audit-daily-1';
  if (select liked from public.photos where id='audit-daily-1') <> 0 then raise exception 'Like count tampering allowed'; end if;
  insert into public.photos(id,owner_id,description)
  values('audit-daily-1',auth.uid(),'upsert edit') on conflict(id) do update set description=excluded.description;
end $$;
reset role;
insert into public.user_blocks(blocker_id,blocked_id) values('e1ffca11-0000-4000-8000-000000000002','e1ffca11-0000-4000-8000-000000000003');
set local role authenticated;
do $$ begin
  begin
    perform public.set_photo_like('audit-public-1',true);
    raise exception 'Blocked photo like allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','e1ffca11-0000-4000-8000-000000000003',true);
set local role authenticated;
do $$ begin
  insert into public.photos(id,owner_id,visibility,shared) values('audit-new-private',auth.uid(),'private',false);
  begin
    update public.photos set visibility='public',shared=true where id='audit-new-private';
    raise exception 'New account public quota bypass allowed';
  exception when check_violation then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','e1ffca11-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ begin
  begin
    insert into public.photos(id,owner_id) values('audit-over-account',auth.uid());
    raise exception 'Account quota bypass allowed';
  exception when check_violation then null;
  end;
  insert into public.photos(id,owner_id,description) values('audit-old-1',auth.uid(),'edit at limit')
  on conflict(id) do update set description=excluded.description;
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.photos p where id like 'audit-%' and liked<>(select count(*) from public.user_likes l where l.photo_id=p.id)) then raise exception 'Likes mismatch'; end if;
  if (select file_size_limit from storage.buckets where id='photos') <> 15728640 then raise exception 'Bucket size limit missing'; end if;
end $$;
rollback;
