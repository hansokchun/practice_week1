-- SECURITY DEFINER 경로도 목록 RLS와 같은 legacy link 경계를 적용한다.
create or replace function public.set_photo_like(target_photo_id text, should_like boolean)
returns integer language plpgsql security definer set search_path = ''
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
    and (p.owner_id = current_user_id or (
      p.visibility is distinct from 'link' and (p.visibility = 'public' or p.shared is true)
    ))
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
grant execute on function public.set_photo_like(text, boolean) to authenticated;
