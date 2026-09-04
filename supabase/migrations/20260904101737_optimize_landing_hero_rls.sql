drop policy if exists "public hero photos expose public photos only"
on public.landing_hero_photos;

drop policy if exists "admins insert hero photos"
on public.landing_hero_photos;

drop policy if exists "admins update hero photos"
on public.landing_hero_photos;

drop policy if exists "admins delete hero photos"
on public.landing_hero_photos;

create policy "public hero photos expose public photos only"
on public.landing_hero_photos
for select
to anon, authenticated
using (
    exists (
        select 1
        from public.photos photo
        where photo.id = landing_hero_photos.photo_id
          and (photo.shared or photo.visibility = 'public')
    )
    or coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
);

create policy "admins insert hero photos"
on public.landing_hero_photos
for insert
to authenticated
with check (
    coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
);

create policy "admins update hero photos"
on public.landing_hero_photos
for update
to authenticated
using (
    coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
)
with check (
    coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
);

create policy "admins delete hero photos"
on public.landing_hero_photos
for delete
to authenticated
using (
    coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
);
