alter table public.photos
  add column if not exists link_token_hash text,
  add column if not exists link_token_created_at timestamp with time zone;

alter table public.photos
  add constraint photos_mobile_link_token_boundary_check
  check (
    (link_token_hash is null and link_token_created_at is null)
    or (
      link_token_hash ~ '^[0-9a-f]{64}$'
      and link_token_created_at is not null
      and visibility = 'private'
      and shared is false
    )
  ) not valid;

alter table public.photos
  validate constraint photos_mobile_link_token_boundary_check;

create unique index photos_link_token_hash_unique_idx
  on public.photos (link_token_hash)
  where link_token_hash is not null;

comment on column public.photos.link_token_hash is
  'SHA-256 hash of a 256-bit mobile share token. Raw tokens never enter Postgres.';

comment on column public.photos.link_token_created_at is
  'Creation time for the active mobile link token; null when link sharing is disabled.';
