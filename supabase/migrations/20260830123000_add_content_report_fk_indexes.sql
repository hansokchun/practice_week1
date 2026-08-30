create index if not exists content_reports_reported_user_id_idx
  on public.content_reports (reported_user_id);

create index if not exists content_reports_photo_id_idx
  on public.content_reports (photo_id);
