-- 예전 link 값은 추측 가능한 목록 권한으로 공유하지 않는다.
-- 현재 웹 UI는 공개/비공개만 제공하며, 모바일의 private+token 공유는 그대로 둔다.
-- 기존 공개/차단/활성 계정 정책은 유지하고 제한 조건만 추가한다.
create policy photos_legacy_link_owner_only on public.photos
as restrictive for select to anon, authenticated
using (visibility is distinct from 'link' or owner_id = (select auth.uid()));

create policy albums_legacy_link_owner_only on public.albums
as restrictive for select to anon, authenticated
using (visibility is distinct from 'link' or owner_id = (select auth.uid()));
