create table public.received_like_inbox (
  user_id uuid primary key references auth.users(id) on delete cascade,
  received_count bigint not null default 0 check (received_count >= 0),
  read_count bigint not null default 0 check (read_count between 0 and received_count)
);
alter table public.received_like_inbox enable row level security;
revoke all on public.received_like_inbox from anon, authenticated;
grant select on public.received_like_inbox to authenticated;
create policy received_like_inbox_select_own on public.received_like_inbox
  for select to authenticated using (user_id = (select auth.uid()));

insert into public.received_like_inbox(user_id, received_count)
select p.owner_id, count(*) from public.user_likes l join public.photos p on p.id = l.photo_id
where p.owner_id is not null and l.user_id <> p.owner_id group by p.owner_id;

create function public.record_received_photo_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  select owner_id into recipient from public.photos where id = new.photo_id;
  if recipient is not null and recipient <> new.user_id then
    insert into public.received_like_inbox(user_id, received_count) values (recipient, 1)
    on conflict(user_id) do update set received_count = public.received_like_inbox.received_count + 1;
  end if;
  return new;
end;
$$;
revoke all on function public.record_received_photo_like() from public, anon, authenticated;
create trigger record_received_photo_like after insert on public.user_likes
  for each row execute function public.record_received_photo_like();

create function public.mark_received_likes_read(seen_count bigint) returns void
language sql security definer set search_path = '' as $$
  update public.received_like_inbox
  set read_count = greatest(read_count, least(received_count, seen_count))
  where user_id = (select auth.uid()) and seen_count >= 0;
$$;
revoke all on function public.mark_received_likes_read(bigint) from public, anon;
grant execute on function public.mark_received_likes_read(bigint) to authenticated;
