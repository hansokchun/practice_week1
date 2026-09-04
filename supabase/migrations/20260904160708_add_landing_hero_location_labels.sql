alter table public.landing_hero_photos
    add column if not exists location_label text;

update public.landing_hero_photos
set location_label = case photo_id
    when '1788402109216-23' then '가가와 도노쇼'
    when '1788376516999-14' then '도쿄 분쿄'
    when '1788370056854-9' then '가나가와 오이소'
    when '1788456098732-2' then '가가와 간온지'
    when '1788453698286-10' then '가오슝 치진'
    else location_label
end
where location_label is null or btrim(location_label) = '';

comment on column public.landing_hero_photos.location_label is
    'Short administrator-managed location shown on the landing slideshow.';
