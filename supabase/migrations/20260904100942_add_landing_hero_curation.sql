create table if not exists public.landing_hero_photos (
    photo_id text primary key references public.photos(id) on delete cascade,
    sort_order integer not null default 0 check (sort_order between 0 and 4),
    created_at timestamptz not null default now()
);

create index if not exists landing_hero_photos_sort_order_idx
    on public.landing_hero_photos (sort_order);

alter table public.landing_hero_photos enable row level security;

revoke all on table public.landing_hero_photos from anon, authenticated;
grant select on table public.landing_hero_photos to anon, authenticated;
grant insert, update, delete on table public.landing_hero_photos to authenticated;

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
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);

create policy "admins insert hero photos"
on public.landing_hero_photos
for insert
to authenticated
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "admins update hero photos"
on public.landing_hero_photos
for update
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "admins delete hero photos"
on public.landing_hero_photos
for delete
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');
