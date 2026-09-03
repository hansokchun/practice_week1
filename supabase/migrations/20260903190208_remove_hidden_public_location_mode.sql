-- Public photos use one of the two user-facing location levels.
-- Keep hidden as a legacy database value for older private rows, but do not
-- allow a public photo to remain hidden after this migration.
update public.photos
set location_precision = 'approximate'
where visibility = 'public'
  and shared is true
  and location_precision = 'hidden';
