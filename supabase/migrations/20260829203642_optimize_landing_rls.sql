create index if not exists landing_section_photos_photo_id_idx
    on public.landing_section_photos (photo_id);

drop policy if exists "visible landing sections are public" on public.landing_sections;
create policy "visible landing sections are public"
on public.landing_sections
for select
to anon, authenticated
using (
    is_visible
    or coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
);

drop policy if exists "admins insert landing sections" on public.landing_sections;
create policy "admins insert landing sections"
on public.landing_sections
for insert
to authenticated
with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

drop policy if exists "admins update landing sections" on public.landing_sections;
create policy "admins update landing sections"
on public.landing_sections
for update
to authenticated
using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin')
with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

drop policy if exists "admins delete landing sections" on public.landing_sections;
create policy "admins delete landing sections"
on public.landing_sections
for delete
to authenticated
using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

drop policy if exists "public assignments only expose public photos" on public.landing_section_photos;
create policy "public assignments only expose public photos"
on public.landing_section_photos
for select
to anon, authenticated
using (
    (
        exists (
            select 1
            from public.landing_sections section
            where section.id = landing_section_photos.section_id
              and section.is_visible
        )
        and exists (
            select 1
            from public.photos photo
            where photo.id = landing_section_photos.photo_id
              and (photo.shared or photo.visibility = 'public')
        )
    )
    or coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
);

drop policy if exists "admins insert landing assignments" on public.landing_section_photos;
create policy "admins insert landing assignments"
on public.landing_section_photos
for insert
to authenticated
with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

drop policy if exists "admins update landing assignments" on public.landing_section_photos;
create policy "admins update landing assignments"
on public.landing_section_photos
for update
to authenticated
using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin')
with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

drop policy if exists "admins delete landing assignments" on public.landing_section_photos;
create policy "admins delete landing assignments"
on public.landing_section_photos
for delete
to authenticated
using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');
