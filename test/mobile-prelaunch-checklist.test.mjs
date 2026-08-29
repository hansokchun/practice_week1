import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const checklist = readFileSync('docs/mobile/prelaunch-checklist.md', 'utf8');
const mobilePackage = JSON.parse(readFileSync('mobile/package.json', 'utf8'));
const mobileAppConfig = JSON.parse(readFileSync('mobile/app.json', 'utf8'));
const mobileGitignore = readFileSync('mobile/.gitignore', 'utf8');
const schemaVerifier = readFileSync('mobile/scripts/verify-local-schema.mjs', 'utf8');

test('모바일 출시 전 체크리스트는 항목을 보존하는 고정 출시 원장이다', () => {
    assert.match(checklist, /추가한 항목을 삭제하거나 번호 체계를 임의로 바꾸지 않는다/);
    assert.match(checklist, /완료할 때 `\[ \]`를 `\[x\]`로 바꾸고/);
    assert.match(checklist, /모바일 앱에는 앨범 기능을 넣지 않는다/);
});

test('모바일 체크리스트는 기반 완료와 운영 통합 미완료를 구분한다', () => {
    assert.match(checklist, /- \[x\] Expo Router 앱 골격을 만들고/);
    assert.match(checklist, /- \[x\] SQLite 스키마와 마이그레이션 실행기를 구현하고 테스트한다/);
    assert.match(checklist, /- \[x\] 모바일 앱에 운영용 Supabase 클라이언트를 설치하고 구성한다/);
    assert.match(checklist, /- \[x\] 시스템 인증 세션.*Google·Kakao OAuth 클라이언트 동작을 구현한다/);
    assert.match(checklist, /- \[ \] 최종 iOS·Android 앱 식별자로 제한한 운영 지도 SDK/);
    assert.match(checklist, /- \[ \] 깨끗한 체크아웃에서 재현 가능한 iOS·Android 개발 빌드/);
});

test('mobile schema verification runs every release scenario from one command', () => {
    assert.equal(
        mobilePackage.scripts['schema:verify'],
        'node ./scripts/verify-local-schema.mjs --scenario all'
    );
    assert.match(schemaVerifier, /case "all":/);
    assert.match(schemaVerifier, /verifyInvalidMigrationRejection/);
});

test('mobile CI pins the supported runtime and executes every required quality gate', () => {
    const workflow = readFileSync('.github/workflows/mobile-ci.yml', 'utf8');

    assert.match(workflow, /permissions:\s*\n\s+contents: read/);
    assert.match(workflow, /node-version: 22\.x/);
    assert.match(workflow, /working-directory: mobile/);
    for (const command of ['npm ci', 'npm run doctor', 'npm run platform:verify', 'npm run audit:release', 'npm run privacy:verify', 'npm run security:verify', 'npm run lint', 'npm run typecheck', 'npm test -- --runInBand', 'npm run schema:verify']) {
        assert.match(workflow, new RegExp(`run: ${command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    }
    assert.doesNotMatch(workflow, /service[_-]?role|sb_secret_|SUPABASE_(?:KEY|TOKEN)/i);
});

test('Expo project health stays reproducible without hiding local native modules', () => {
    assert.equal(mobilePackage.scripts.doctor, 'expo-doctor && expo install --check');
    assert.match(mobilePackage.devDependencies['expo-doctor'], /^\d+\.\d+\.\d+$/);
    assert.equal(Object.hasOwn(mobileAppConfig.expo, 'newArchEnabled'), false);
    assert.match(mobileGitignore, /^\/ios\/$/m);
    assert.match(mobileGitignore, /^\/android\/$/m);
    assert.doesNotMatch(mobileGitignore, /^(?:ios|android)\/$/m);
});

test('mobile release artifact audit is a required local and CI gate', () => {
    assert.equal(mobilePackage.scripts['audit:release'], 'node ./scripts/audit-release-artifacts.mjs');
});
