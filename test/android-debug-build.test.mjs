import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildAndroidDebug, getAndroidDebugBuildPlan } from '../scripts/build-android-debug.mjs';

test('Android trial builds use project-scoped tools and caches without deployment or installation', () => {
    const root = '/tmp/project with spaces';
    const plan = getAndroidDebugBuildPlan({ root, environment: {} });
    assert.equal(plan.cwd, `${root}/app-shell/android`);
    assert.equal(plan.command, `${root}/app-shell/android/gradlew`);
    assert.equal(plan.environment.JAVA_HOME, `${root}/app-shell/.toolchain/java/jdk-21.0.12.1+1/Contents/Home`);
    assert.equal(plan.environment.ANDROID_HOME, `${root}/app-shell/.toolchain/android-sdk`);
    assert.equal(plan.environment.GRADLE_USER_HOME, `${root}/app-shell/.toolchain/gradle`);
    assert.equal(plan.environment.ANDROID_USER_HOME, `${root}/app-shell/.toolchain/android-user`);
    assert.equal('HOME' in plan.environment, false);
    assert.ok(plan.args.includes('--no-daemon'));
    assert.ok(plan.args.includes('--max-workers=2'));
    assert.ok(plan.args.includes(':app:testDebugUnitTest'));
    assert.ok(plan.args.includes(':app:lintDebug'));
    assert.ok(plan.args.includes(':app:assembleDebug'));
    assert.ok(!plan.args.some(arg => /install|release|clean/i.test(arg)));
});

function fakeBuild(failure) {
    const calls = [];
    const copies = [];
    const writes = [];
    const options = {
        root: '/tmp/build-fixture', environment: {},
        runCommand: (command, args) => {
            const step = command === process.execPath ? 'preflight' : command.endsWith('/keytool') ? 'keytool' : 'gradle';
            calls.push(step);
            return failure === step ? 7 : 0;
        },
        exists: path => !path.endsWith('debug.keystore'),
        readBytes: path => Buffer.from(path.endsWith('index.html') ? 'fixture bundle' : 'fixture apk'),
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
    assert.deepEqual(fixture.calls, ['preflight', 'keytool', 'gradle']);
    const evidence = JSON.parse(fixture.writes[0][1]);
    assert.equal(evidence.createdAt, '2026-10-14T12:00:00.000Z');
    assert.match(evidence.inputBundleIndexSha256, /^[a-f0-9]{64}$/);
    assert.equal(evidence.apkSignatureVerified, false);
    assert.equal(evidence.packagedBundleVerified, false);
    assert.equal(evidence.installedDeviceVerified, false);
    assert.equal(evidence.upgradeVerified, false);
});

test('custom toolchain paths are explicit and preserved, while artifacts never overwrite the source APK', () => {
    const plan = getAndroidDebugBuildPlan({ root: '/tmp/project', environment: {
        IKKYEE_JAVA_HOME: '/tmp/jdk', IKKYEE_ANDROID_SDK: '/tmp/sdk', IKKYEE_GRADLE_HOME: '/tmp/gradle'
    } });
    assert.equal(plan.environment.JAVA_HOME, '/tmp/jdk');
    assert.equal(plan.environment.ANDROID_HOME, '/tmp/sdk');
    assert.equal(plan.environment.GRADLE_USER_HOME, '/tmp/gradle');
    assert.equal(plan.artifact, '/tmp/project/app-shell/artifacts/android/ikkyee-android-debug.apk');
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
});
