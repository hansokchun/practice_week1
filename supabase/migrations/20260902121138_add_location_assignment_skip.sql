alter table public.photos
    add column if not exists location_assignment_skipped boolean not null default false;
