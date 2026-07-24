alter table public.photo_private_locations
    drop constraint if exists photo_private_locations_photo_id_fkey;

alter table public.photo_private_locations
    add constraint photo_private_locations_photo_id_fkey
    foreign key (photo_id)
    references public.photos(id)
    on delete cascade
    deferrable initially deferred;
