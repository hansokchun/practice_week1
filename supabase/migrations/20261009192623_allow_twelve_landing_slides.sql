alter table public.landing_hero_photos
  drop constraint landing_hero_photos_sort_order_check,
  add constraint landing_hero_photos_sort_order_check check (sort_order between 0 and 11);
