import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { test } from 'node:test';
import { buildAndroidDebug, getAndroidDebugBuildPlan } from '../scripts/build-android-debug.mjs';

test('Android trial builds use project-scoped tools and caches without deployment or installation', () => {
    const root = resolve('/tmp/project with spaces');
    const plan = getAndroidDebugBuildPlan({ root, environment: {} });
    assert.equal(plan.cwd, join(root, 'app-shell/android'));
    assert.equal(plan.command, join(root, 'app-shell/android/gradlew'));
    assert.equal(plan.environment.JAVA_HOME, join(root, 'app-shell/.toolchain/java/jdk-21.0.12.1+1/Contents/Home'));
    assert.equal(plan.environment.ANDROID_HOME, join(root, 'app-shell/.toolchain/android-sdk'));
    assert.equal(plan.environment.GRADLE_USER_HOME, join(root, 'app-shell/.toolchain/gradle'));
    assert.equal(plan.environment.ANDROID_USER_HOME, join(root, 'app-shell/.toolchain/android-user'));
    assert.equal('HOME' in plan.environment, false);
    assert.ok(plan.args.includes('--no-daemon'));
    assert.ok(plan.args.includes('--max-workers=2'));
    assert.ok(plan.args.includes(':app:testDebugUnitTest'));
    assert.ok(plan.args.includes(':app:lintDebug'));
    assert.ok(plan.args.includes(':app:assembleDebug'));
    assert.ok(!plan.args.some(arg => /install|release|clean/i.test(arg)));
});

function fakeBuild(failure) {
    const root = resolve('/tmp/build-fixture');
    const calls = [];
    const copies = [];
    const writes = [];
    const options = {
        root, environment: {},
        runCommand: (command, args) => {
            const step = command === process.execPath ? 'preflight' : basename(command) === 'keytool' ? 'keytool' : 'gradle';
            calls.push(step);
            return failure === step ? 7 : 0;
        },
        exists: path => !path.endsWith('debug.keystore'),
        readBytes: path => Buffer.from(path.endsWith('index.html') ? 'fixture bundle' : 'fixture apk'),
        verifyArtifact: input => {
            calls.push('verify');
            assert.equal(input.apkPath, join(root, 'app-shell/android/app/build/outputs/apk/debug/app-debug.apk'));
            assert.equal(input.sdkPath, join(root, 'app-shell/.toolchain/android-sdk'));
            assert.equal(input.bundleDirectory, join(root, 'app-shell/www'));
            if (failure === 'verify') throw new Error('APK verification failed');
            return {
                verified: true, apkSignatureVerified: true, packagedBundleVerified: true,
                sha256: createHash('sha256').update('fixture apk').digest('hex'), bytes: 11,
                signing: { verified: true, signerCount: 1, certificateSha256: ['a'.repeat(64)] },
                webBundle: { indexSha256: createHash('sha256').update('fixture bundle').digest('hex') },
                verifiedAt: '2026-10-14T12:00:00.000Z'
            };
        },
        makeDirectory: () => {},
        copyFile: (...args) => copies.push(args),
        writeFile: (...args) => writes.push(args),
        now: () => new Date('2026-10-14T12:00:00Z'),
        log: () => {}
    };
    return { options, calls, copies, writes };
}

test('failed preflight, key generation or Gradle never copy an old APK or claim a new artifact', () => {
    for (const step of ['preflight', 'keytool', 'gradle']) {
        const fixture = fakeBuild(step);
        assert.equal(buildAndroidDebug(fixture.options), 7);
        assert.equal(fixture.copies.length, 0);
        assert.equal(fixture.writes.length, 0);
        assert.equal(fixture.calls.at(-1), step);
    }
});

test('successful artifact records build time and input fingerprint, not unverified phone behavior', () => {
    const fixture = fakeBuild();
    assert.equal(buildAndroidDebug(fixture.options), 0);
    assert.equal(fixture.copies.length, 1);
    assert.deepEqual(fixture.calls, ['preflight', 'keytool', 'gradle', 'verify']);
    const evidence = JSON.parse(fixture.writes[0][1]);
    assert.equal(evidence.createdAt, '2026-10-14T12:00:00.000Z');
    assert.match(evidence.inputBundleIndexSha256, /^[a-f0-9]{64}$/);
    assert.equal(evidence.apkSignatureVerified, true);
    assert.equal(evidence.packagedBundleVerified, true);
    assert.equal(evidence.signing.verified, true);
    assert.equal(evidence.webBundle.indexSha256, evidence.inputBundleIndexSha256);
    assert.equal(evidence.installedDeviceVerified, false);
    assert.equal(evidence.upgradeVerified, false);
});

test('APK verification failures cannot copy or label an artifact as verified', () => {
    const fixture = fakeBuild('verify');
    assert.throws(() => buildAndroidDebug(fixture.options), /APK verification failed/);
    assert.equal(fixture.copies.length, 0);
    assert.equal(fixture.writes.length, 0);
});

test('incomplete, stale or changed verification evidence cannot publish a trial artifact', () => {
    for (const change of [
        evidence => ({ ...evidence, verified: false }),
        evidence => ({ ...evidence, apkSignatureVerified: false }),
        evidence => ({ ...evidence, packagedBundleVerified: false }),
        evidence => ({ ...evidence, sha256: 'f'.repeat(64) }),
        evidence => ({ ...evidence, bytes: 12 }),
        evidence => ({ ...evidence, webBundle: { indexSha256: 'f'.repeat(64) } })
    ]) {
        const fixture = fakeBuild();
        const verify = fixture.options.verifyArtifact;
        fixture.options.verifyArtifact = input => change(verify(input));
        assert.throws(() => buildAndroidDebug(fixture.options), /APK/);
        assert.equal(fixture.copies.length, 0);
        assert.equal(fixture.writes.length, 0);
    }
});

test('an artifact changed during copying receives no verified metadata', () => {
    const fixture = fakeBuild();
    const read = fixture.options.readBytes;
    fixture.options.readBytes = path => path.endsWith('ikkyee-android-debug.apk') ? Buffer.from('changed artifact') : read(path);
    assert.throws(() => buildAndroidDebug(fixture.options), /APK/);
    assert.equal(fixture.copies.length, 1);
    assert.equal(fixture.writes.length, 0);
});

test('custom toolchain paths are explicit and preserved, while artifacts never overwrite the source APK', () => {
    const root = resolve('/tmp/project');
    const plan = getAndroidDebugBuildPlan({ root, environment: {
        IKKYEE_JAVA_HOME: '/tmp/jdk', IKKYEE_ANDROID_SDK: '/tmp/sdk', IKKYEE_GRADLE_HOME: '/tmp/gradle'
    } });
    assert.equal(plan.environment.JAVA_HOME, '/tmp/jdk');
    assert.equal(plan.environment.ANDROID_HOME, '/tmp/sdk');
    assert.equal(plan.environment.GRADLE_USER_HOME, '/tmp/gradle');
    assert.equal(plan.artifact, join(root, 'app-shell/artifacts/android/ikkyee-android-debug.apk'));
    assert.notEqual(plan.sourceApk, plan.artifact);
});

test('debug keystore and downloaded tooling stay out of Git, separate from release signing', () => {
    const source = readFileSync('app-shell/android/app/build.gradle', 'utf8');
    assert.match(source, /buildToolsVersion '36\.0\.0'/);
    assert.match(source, /signingConfigs[\s\S]*?debug[\s\S]*?\.toolchain\/android-user\/debug\.keystore/);
    const ignore = readFileSync('.gitignore', 'utf8');
    assert.ok(ignore.includes('app-shell/.toolchain/'));
    assert.ok(ignore.includes('app-shell/artifacts/'));
    const wrapper = readFileSync('app-shell/android/gradle/wrapper/gradle-wrapper.properties', 'utf8');
    assert.match(wrapper, /distributionSha256Sum=[a-f0-9]{64}/);
    const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
    assert.equal(scripts['app:doctor:android'], 'node scripts/build-android-debug.mjs --check');
    assert.equal(scripts['app:verify:android'], 'node scripts/verify-android-apk.mjs');
});
