-- Run against a database with a public photo and two users. All changes roll back.
begin;
do $$
declare
  photo text;
  owner uuid;
  actor uuid;
  before_count bigint;
  after_count bigint;
  seen bigint;
  unread bigint;
  leaked_rows bigint;
begin
  select p.id, p.owner_id, u.id into photo, owner, actor
  from public.photos p cross join auth.users u
  where p.visibility = 'public' and p.owner_id <> u.id
    and not exists (select 1 from public.user_likes l where l.photo_id = p.id and l.user_id = u.id)
    and not exists (select 1 from public.user_blocks b where b.blocker_id = u.id and b.blocked_id = p.owner_id)
  limit 1;
  assert photo is not null, 'Need a public photo and another user';
  select coalesce((select received_count from public.received_like_inbox where user_id = owner), 0) into before_count;
  perform set_config('request.jwt.claim.sub', actor::text, true);
  execute 'set local role authenticated';
  perform public.set_photo_like(photo, true);
  perform public.set_photo_like(photo, true);
  execute 'reset role';
  select received_count into after_count from public.received_like_inbox where user_id = owner;
  assert after_count = before_count + 1, 'A new like must notify the photo owner';

  perform set_config('request.jwt.claim.sub', owner::text, true);
  execute 'set local role authenticated';
  perform public.set_photo_like(photo, true);
  execute 'reset role';
  select received_count into seen from public.received_like_inbox where user_id = owner;
  assert seen = after_count, 'Self likes must not create notifications';
  perform set_config('request.jwt.claim.sub', owner::text, true);
  execute 'set local role authenticated';
  perform public.mark_received_likes_read(seen);
  execute 'reset role';
  select received_count - read_count into unread from public.received_like_inbox where user_id = owner;
  assert unread = 0, 'Clicking the notification must mark it read';

  perform set_config('request.jwt.claim.sub', actor::text, true);
  execute 'set local role authenticated';
  perform public.set_photo_like(photo, false);
  perform public.set_photo_like(photo, true);
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', owner::text, true);
  perform public.mark_received_likes_read(seen);
  select received_count - read_count into unread from public.received_like_inbox where user_id = owner;
  assert unread = 1, 'A stale click must not consume a newly arrived like';

  execute 'set local role authenticated';
  select count(*) into leaked_rows from public.received_like_inbox where user_id <> owner;
  assert leaked_rows = 0, 'Users must not read another inbox';
  begin
    update public.received_like_inbox set received_count = received_count + 1 where user_id = owner;
    raise exception 'Clients must not forge notification counts';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  assert not has_table_privilege('anon', 'public.received_like_inbox', 'SELECT');
  assert not has_function_privilege('anon', 'public.mark_received_likes_read(bigint)', 'EXECUTE');
end;
$$;
rollback;
