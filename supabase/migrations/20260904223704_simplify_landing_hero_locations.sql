update public.landing_hero_photos
set location_label = case photo_id
    when '1788402109216-23' then '일본 · 가가와'
    when '1788376516999-14' then '일본 · 도쿄'
    when '1788370056854-9' then '일본 · 가나가와'
    when '1788456098732-2' then '일본 · 가가와'
    when '1788453698286-10' then '대만 · 가오슝'
    else location_label
end
where photo_id in (
    '1788402109216-23',
    '1788376516999-14',
    '1788370056854-9',
    '1788456098732-2',
    '1788453698286-10'
);
