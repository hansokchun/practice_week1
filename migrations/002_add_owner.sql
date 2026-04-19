-- /migrations/002_add_owner.sql
-- 로그인 기능 연동을 위해 각 레코드에 소유자(owner) 정보를 추가합니다.
-- 기존 데이터들은 shared = 1로 일괄 전환하여 모두가 볼 수 있도록 유지합니다.

ALTER TABLE photos ADD COLUMN owner_id TEXT;
ALTER TABLE comments ADD COLUMN author_id TEXT;

-- 기존 사진을 퍼블릭 공유로 전환 (owner_id가 없는 레거시 데이터)
UPDATE photos SET shared = 1 WHERE owner_id IS NULL;
