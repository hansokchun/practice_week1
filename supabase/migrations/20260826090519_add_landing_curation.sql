create table if not exists public.landing_sections (
    id uuid primary key default gen_random_uuid(),
    title text not null check (char_length(btrim(title)) between 1 and 80),
    description text not null default '' check (char_length(description) <= 180),
    sort_order integer not null default 0 check (sort_order >= 0),
    is_visible boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.landing_section_photos (
    section_id uuid not null references public.landing_sections(id) on delete cascade,
    photo_id text not null references public.photos(id) on delete cascade,
    sort_order integer not null default 0 check (sort_order >= 0),
    created_at timestamptz not null default now(),
    primary key (section_id, photo_id)
);

create index if not exists landing_sections_public_order_idx
    on public.landing_sections (is_visible, sort_order);

create index if not exists landing_section_photos_order_idx
    on public.landing_section_photos (section_id, sort_order);

alter table public.landing_sections enable row level security;
alter table public.landing_section_photos enable row level security;

revoke all on table public.landing_sections from anon, authenticated;
revoke all on table public.landing_section_photos from anon, authenticated;
grant select on table public.landing_sections to anon, authenticated;
grant select on table public.landing_section_photos to anon, authenticated;
grant insert, update, delete on table public.landing_sections to authenticated;
grant insert, update, delete on table public.landing_section_photos to authenticated;

create policy "visible landing sections are public"
on public.landing_sections
for select
to anon, authenticated
using (
    is_visible
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);

create policy "admins insert landing sections"
on public.landing_sections
for insert
to authenticated
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "admins update landing sections"
on public.landing_sections
for update
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "admins delete landing sections"
on public.landing_sections
for delete
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

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
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);

create policy "admins insert landing assignments"
on public.landing_section_photos
for insert
to authenticated
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "admins update landing assignments"
on public.landing_section_photos
for update
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "admins delete landing assignments"
on public.landing_section_photos
for delete
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');
