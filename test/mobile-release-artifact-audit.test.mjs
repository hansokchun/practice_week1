import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

import {
  auditPath,
  auditText,
} from '../mobile/scripts/audit-release-artifacts.mjs';

test('release audit rejects credentials without echoing their values', () => {
  const samples = [
    ['mobile/src/config.ts', 'const key = "sb_secret_abcdefghijklmnopqrstuvwxyz123456";'],
    ['mobile/src/config.ts', 'const key = "AIzaSyDUMMYDUMMYDUMMYDUMMYDUMMYDUMMY";'],
    ['mobile/src/config.ts', 'const url = "postgresql://owner:password@example.invalid/app";'],
    ['mobile/src/config.ts', '-----BEGIN PRIVATE KEY-----'],
  ];

  for (const [path, contents] of samples) {
    const findings = auditText(path, contents);
    assert.ok(findings.length > 0);
    assert.equal(findings.every(({ detail }) => !detail.includes(contents)), true);
  }
});

test('release audit rejects private artifacts, precise coordinate fixtures, and sensitive logging', () => {
  assert.deepEqual(auditPath('mobile/debug/session.log'), [{ code: 'forbidden-artifact', path: 'mobile/debug/session.log' }]);
  assert.deepEqual(auditPath('mobile/certs/release.p12'), [{ code: 'forbidden-artifact', path: 'mobile/certs/release.p12' }]);
  assert.deepEqual(auditPath('mobile/assets/private-trip.jpg'), [{ code: 'unapproved-media', path: 'mobile/assets/private-trip.jpg' }]);
  assert.ok(auditText('mobile/src/example.ts', 'const place = { lat: 37.123456, lng: 127.123456 };').some(({ code }) => code === 'precise-coordinate'));
  assert.ok(auditText('mobile/src/example.ts', 'console.log("session", sessionToken);').some(({ code }) => code === 'sensitive-log'));
});

test('release audit accepts approved public mobile configuration and assets', () => {
  assert.deepEqual(auditPath('mobile/assets/favicon.png'), []);
  assert.deepEqual(auditPath('mobile/assets/app-icon.png'), []);
  assert.deepEqual(auditPath('mobile/assets/app-icon-foreground.png'), []);
  assert.deepEqual(auditPath('mobile/.env.example'), []);
  assert.deepEqual(auditText('mobile/.env.example', [
    'EXPO_PUBLIC_APP_ENV=development',
    'EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-local-publishable-key',
  ].join('\n')), []);
  assert.deepEqual(auditText('mobile/app/auth/login.tsx', 'placeholder="name@example.com"'), []);
  assert.deepEqual(auditText('docs/policy.md', 'Never store service-role credentials here.'), []);
});

test('current mobile release scope passes without exposing match contents', () => {
  const stdout = execFileSync(process.execPath, ['mobile/scripts/audit-release-artifacts.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const report = JSON.parse(stdout);

  assert.equal(report.status, 'PASS');
  assert.equal(report.findingCount, 0);
  assert.ok(report.scannedFileCount > 0);
  assert.equal(Object.hasOwn(report, 'contents'), false);
});
