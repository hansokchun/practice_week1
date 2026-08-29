alter table public.photos
    add column if not exists ai_tags text[] not null default '{}',
    add column if not exists ai_summary text not null default '',
    add column if not exists ai_scene text not null default 'other',
    add column if not exists ai_moods text[] not null default '{}',
    add column if not exists ai_analysis_status text not null default 'pending',
    add column if not exists ai_analyzed_at timestamp with time zone,
    add column if not exists ai_analysis_model text;

alter table public.photos
    drop constraint if exists photos_ai_analysis_status_check;

alter table public.photos
    add constraint photos_ai_analysis_status_check
    check (ai_analysis_status in ('pending', 'processing', 'complete', 'failed'));

create index if not exists photos_ai_tags_gin_idx
    on public.photos using gin (ai_tags);
