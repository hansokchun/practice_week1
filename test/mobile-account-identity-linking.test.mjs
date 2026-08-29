import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const implementation = readFileSync('mobile/src/account-identity-linking.ts', 'utf8');
const profile = readFileSync('mobile/app/profile.tsx', 'utf8');
const policy = readFileSync('docs/mobile/account-identity-linking.md', 'utf8');

test('mobile account linking preserves one verified Supabase user boundary', () => {
  assert.match(implementation, /linkIdentity/);
  assert.match(implementation, /verified\.data\.user\?\.id !== expectedUserId/);
  assert.match(implementation, /signOut\(\{ scope: "local" \}\)/);
  assert.doesNotMatch(implementation, /user_metadata|raw_user_meta_data/);
  assert.match(profile, /AccountIdentitySection/);
});

test('account linking policy separates safe automation from release-only provider gates', () => {
  assert.match(policy, /검증 이메일/);
  assert.match(policy, /Enable Manual Linking/);
  assert.match(policy, /auth\.uid\(\)/);
  assert.match(policy, /user_metadata.*권한 결정에 사용하지 않는다/);
  assert.match(policy, /완료로 전환하지 않는다/);
});
