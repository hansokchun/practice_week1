begin;

do $$
declare
  owner uuid;
  first_album uuid := gen_random_uuid();
  linked_album uuid := gen_random_uuid();
  cover_album uuid := gen_random_uuid();
  first_photo text := 'delete-regression-' || gen_random_uuid()::text;
  second_photo text := 'delete-regression-' || gen_random_uuid()::text;
  original_path text;
  snapshot record;
begin
  select id into owner from auth.users order by created_at limit 1;
  if owner is null then raise exception 'Regression needs an existing auth user'; end if;
  original_path := owner::text || '/' || first_photo || '.jpg';
  insert into public.albums(id, owner_id, title, visibility, photo_count, cover_url) values
    (first_album, owner, 'delete regression', 'private', 2, 'https://example.test/' || original_path || '?token=old'),
    (linked_album, owner, 'membership regression', 'private', 2, 'https://example.test/custom-cover.jpg'),
    (cover_album, owner, 'cover-only regression', 'private', 0, 'https://example.test/' || original_path);
  insert into public.photos(id, owner_id, url, storage_path, date, album_id, visibility, shared) values
    (first_photo, owner, 'https://example.test/first.jpg', original_path, now(), first_album, 'private', false),
    (second_photo, owner, 'https://example.test/survivor.jpg', owner::text || '/' || second_photo || '.jpg', now(), first_album, 'private', false);
  insert into public.album_photos(album_id, photo_id, sort_order) values
    (first_album, first_photo, 0), (first_album, second_photo, 1),
    (linked_album, first_photo, 0), (linked_album, second_photo, 1);
  delete from public.photos where id = first_photo;
  select photo_count, cover_url into snapshot from public.albums where id = first_album;
  if snapshot.photo_count <> 1 or snapshot.cover_url <> 'https://example.test/survivor.jpg' then
    raise exception 'Deleted cover must yield count1 and survivor cover, got %', row_to_json(snapshot);
  end if;
  if exists(select 1 from public.album_photos where photo_id = first_photo) then
    raise exception 'Deleted photo membership was not cascaded';
  end if;
  select photo_count, cover_url into snapshot from public.albums where id = linked_album;
  if snapshot.photo_count <> 1 or snapshot.cover_url <> 'https://example.test/custom-cover.jpg' then
    raise exception 'Membership-only album must count1 and keep its independent cover';
  end if;
  if (select cover_url from public.albums where id = cover_album) is not null then
    raise exception 'Deleted cover-only reference must be cleared';
  end if;
  delete from public.photos where id = second_photo;
  select photo_count, cover_url into snapshot from public.albums where id = first_album;
  if snapshot.photo_count <> 0 or snapshot.cover_url is not null then
    raise exception 'Last photo deletion must yield count0 and no cover';
  end if;
  if (select photo_count from public.albums where id = linked_album) <> 0 then
    raise exception 'Membership-only album must count0 after last deletion';
  end if;
end $$;

rollback;
select 'cover replacement, membership counts, unrelated cover and last deletion passed; fixtures rolled back' as result;
