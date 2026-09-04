-- Location precision describes the author's confidence in the selected point.
-- It must never transform the coordinate shown to another viewer.
create or replace function public.apply_photo_location_privacy()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  if new.lat is not null and new.lng is not null
     and (tg_op = 'INSERT' or new.lat is distinct from old.lat or new.lng is distinct from old.lng) then
    insert into public.photo_private_locations (photo_id, owner_id, lat, lng)
    values (new.id, new.owner_id, new.lat, new.lng)
    on conflict (photo_id) do update
    set owner_id = excluded.owner_id,
        lat = excluded.lat,
        lng = excluded.lng,
        updated_at = now();
  end if;

  return new;
end;
$$;

-- Restore coordinates that the former approximate-publication rule rounded.
update public.photos as photo
set lat = source.lat,
    lng = source.lng
from public.photo_private_locations as source
where source.photo_id = photo.id
  and (photo.lat is distinct from source.lat or photo.lng is distinct from source.lng);

-- A missing coordinate is represented by null lat/lng, not by a hidden accuracy.
update public.photos
set location_precision = case
  when geo_source in ('exif', 'gpx') then 'exact'
  else 'approximate'
end
where location_precision = 'hidden';

alter table public.photos
  alter column location_precision set default 'approximate';

alter table public.photos
  drop constraint if exists photos_location_precision_check;

alter table public.photos
  add constraint photos_location_precision_check
  check (location_precision in ('exact', 'approximate'));

revoke all on function public.apply_photo_location_privacy() from public;
grant all on function public.apply_photo_location_privacy() to service_role;
