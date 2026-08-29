alter table public.comments
  add constraint comments_text_length_check
  check (char_length(btrim(text)) between 1 and 1000) not valid;

create index if not exists comments_author_date_idx
  on public.comments (author_id, date desc);

create or replace function public.enforce_comment_submission_limits()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or new.author_id is distinct from auth.uid() then
    raise exception 'Comment author is invalid' using errcode = '42501';
  end if;

  new.text := btrim(new.text);
  if char_length(new.text) not between 1 and 1000 then
    raise exception 'Comment text is invalid' using errcode = '22023';
  end if;

  -- The server owns the rate-limit clock; clients cannot backdate a row to bypass it.
  new.date := now();

  if (
    select count(*)
    from public.comments as existing_comment
    where existing_comment.author_id = auth.uid()
      and existing_comment.date > now() - interval '60 seconds'
  ) >= 5 then
    raise exception 'Comment rate limit exceeded' using errcode = '54000';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_comment_submission_limits() from public, anon, authenticated;

drop trigger if exists comments_enforce_submission_limits on public.comments;
create trigger comments_enforce_submission_limits
  before insert on public.comments
  for each row execute function public.enforce_comment_submission_limits();

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
  on public.comments
  for delete
  to authenticated
  using (author_id = (select auth.uid()));
