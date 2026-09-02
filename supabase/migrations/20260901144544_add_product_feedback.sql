create table public.product_feedback (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    category text not null check (category in ('bug', 'usability', 'feature_request', 'other')),
    message text not null check (char_length(btrim(message)) between 3 and 1000),
    rating smallint check (rating between 1 and 5),
    page_path text not null default '' check (char_length(page_path) <= 200),
    contact_allowed boolean not null default false,
    status text not null default 'received' check (status in ('received', 'reviewing', 'planned', 'completed', 'closed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index product_feedback_user_created_idx
    on public.product_feedback (user_id, created_at desc);

create index product_feedback_status_created_idx
    on public.product_feedback (status, created_at desc);

alter table public.product_feedback enable row level security;

revoke all on table public.product_feedback from anon, authenticated;
grant select, insert, update on table public.product_feedback to authenticated;

create policy "users read own feedback and admins read all feedback"
on public.product_feedback
for select
to authenticated
using (
    user_id = (select auth.uid())
    or coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
);

create policy "users submit own feedback"
on public.product_feedback
for insert
to authenticated
with check (
    user_id = (select auth.uid())
    and status = 'received'
);

create policy "admins update feedback status"
on public.product_feedback
for update
to authenticated
using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin')
with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

create function public.enforce_product_feedback_submission()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
    current_user_id uuid := (select auth.uid());
    recent_submission_count integer;
begin
    if current_user_id is null or new.user_id is distinct from current_user_id then
        raise exception 'Invalid feedback owner' using errcode = '42501';
    end if;

    select count(*)
    into recent_submission_count
    from public.product_feedback
    where user_id = current_user_id
      and created_at > now() - interval '24 hours';

    if recent_submission_count >= 5 then
        raise exception 'Feedback rate limit exceeded' using errcode = '54000';
    end if;

    new.status := 'received';
    new.created_at := now();
    new.updated_at := now();
    return new;
end;
$$;

revoke all on function public.enforce_product_feedback_submission() from public, anon, authenticated;

create trigger product_feedback_enforce_submission
before insert on public.product_feedback
for each row execute function public.enforce_product_feedback_submission();

create function public.touch_product_feedback_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

revoke all on function public.touch_product_feedback_updated_at() from public, anon, authenticated;

create trigger product_feedback_touch_updated_at
before update on public.product_feedback
for each row execute function public.touch_product_feedback_updated_at();
