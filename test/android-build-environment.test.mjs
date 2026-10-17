import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { test } from 'node:test';

import {
    ANDROID_BUILD_REQUIREMENTS,
    checkAndroidBuildEnvironment,
    inspectSdkLicenses,
    parseJavaVersion
} from '../scripts/check-android-build-environment.mjs';

function fixture() {
    const rootDirectory = resolve('/synthetic-private/project');
    const sdk = resolve('/synthetic-private/sdk');
    const jdk = resolve('/synthetic-private/jdk');
    const files = new Map();
    const commands = [];
    const reads = [];
    const project = (path, text = '') => files.set(join(rootDirectory, path), text);
    const sdkFile = (path, text = '') => files.set(join(sdk, path), text);
    project('capacitor.config.json', JSON.stringify({ appId: 'com.ikkyee.mobile', android: { path: 'app-shell/android' } }));
    project('mobile/app.json', JSON.stringify({ expo: { android: { package: 'com.ikkyee.mobile', versionCode: 1 } } }));
    project('app-shell/android/variables.gradle', 'minSdkVersion = 24\ncompileSdkVersion = 36\ntargetSdkVersion = 36');
    project('app-shell/android/build.gradle', "classpath 'com.android.tools.build:gradle:8.13.0'");
    project('app-shell/android/app/build.gradle', 'buildToolsVersion = "36.0.0"\napplicationId "com.ikkyee.mobile"\nversionCode 1');
    project('app-shell/android/app/capacitor.build.gradle', 'sourceCompatibility JavaVersion.VERSION_21\ntargetCompatibility JavaVersion.VERSION_21');
    project('app-shell/android/gradle/wrapper/gradle-wrapper.properties', 'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.14.3-all.zip');
    project('app-shell/android/gradle/wrapper/gradle-wrapper.jar');
    project('app-shell/android/gradlew');
    project('app-shell/android/settings.gradle');
    project('app-shell/android/capacitor.settings.gradle', "new File('../../node_modules/@capacitor/android/capacitor')");
    project('node_modules/@capacitor/android/capacitor/build.gradle');
    project('app-shell/android/capacitor-cordova-android-plugins/build.gradle');
    project('app-shell/android/capacitor-cordova-android-plugins/cordova.variables.gradle');
    project('app-shell/android/app/src/main/AndroidManifest.xml');
    project('app-shell/android/app/src/main/assets/capacitor.config.json', '{}');
    project('app-shell/android/app/src/main/assets/capacitor.plugins.json', '[]');
    project('app-shell/www/index.html', '<html>native bundle</html>');
    project('app-shell/android/app/src/main/assets/public/index.html', '<html>native bundle</html>');
    sdkFile('platforms/android-36/android.jar');
    sdkFile('platforms/android-36/source.properties', 'AndroidVersion.ApiLevel=36');
    sdkFile('build-tools/36.0.0/source.properties', 'Pkg.Revision=36.0.0');
    for (const tool of ['aapt2', 'apksigner', 'zipalign']) sdkFile(`build-tools/36.0.0/${tool}`);
    sdkFile('platform-tools/adb');
    sdkFile('cmdline-tools/latest/bin/sdkmanager');
    const terms = 'Synthetic SDK terms & conditions.\nRead-only diagnostic fixture.';
    const packageXml = '<repository><license id="android-sdk-license" type="text">'
        + terms.replaceAll('&', '&amp;') + '</license><localPackage><uses-license ref="android-sdk-license"/>'
        + '</localPackage></repository>';
    for (const path of ['platforms/android-36', 'build-tools/36.0.0', 'platform-tools']) sdkFile(`${path}/package.xml`, packageXml);
    sdkFile('licenses/android-sdk-license', createHash('sha1').update(terms).digest('hex') + '\n');
    const options = {
        rootDirectory, env: { JAVA_HOME: jdk, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk },
        nodeVersion: '24.15.0', platform: 'darwin',
        exists: path => files.has(path),
        readText: path => { reads.push(path); return files.get(path) ?? null; },
        runCommand: (command, args) => {
            commands.push({ command: command.replaceAll('\\', '/'), args });
            if (basename(command) === 'javac') return { status: 0, stdout: 'javac 21.0.8\n', stderr: '' };
            if (basename(command) === 'java') return { status: 0, stdout: '', stderr: 'openjdk version "21.0.8" 2025-07-15\n' };
            if (basename(command) === 'adb') return { status: 0,
                stdout: 'Android Debug Bridge version 1.0.41\nInstalled as /synthetic-private/sdk/platform-tools/adb\n', stderr: '' };
            throw new Error('unexpected command');
        }
    };
    return { rootDirectory, sdk, jdk, files, commands, reads, options };
}

const getCheck = (report, id) => report.checks.find(check => check.id === id);

test('Android requirements follow the pinned Capacitor 8 project', () => {
    assert.equal(ANDROID_BUILD_REQUIREMENTS.nodeMajor, 22);
    assert.equal(ANDROID_BUILD_REQUIREMENTS.javaMajor, 21);
    assert.equal(ANDROID_BUILD_REQUIREMENTS.compileSdk, 36);
    assert.equal(ANDROID_BUILD_REQUIREMENTS.buildTools, '36.0.0');
    assert.equal(ANDROID_BUILD_REQUIREMENTS.gradle, '8.14.3');
    assert.equal(ANDROID_BUILD_REQUIREMENTS.androidGradlePlugin, '8.13.0');
});

test('Java parsing accepts only version output and strips vendor messages', () => {
    assert.deepEqual(parseJavaVersion('openjdk version "21.0.8" 2025-07-15\nprivate details'), { major: 21, version: '21.0.8' });
    assert.deepEqual(parseJavaVersion('javac 21.0.8', 'javac'), { major: 21, version: '21.0.8' });
    assert.deepEqual(parseJavaVersion('java version "1.8.0_451"'), { major: 8, version: '1.8.0' });
    assert.equal(parseJavaVersion('Unable to locate Java Runtime'), null);
    assert.equal(parseJavaVersion('/private/credential: 21.0.8'), null);
});

test('a complete host and synchronized project pass without inspecting or installing a device', () => {
    const fake = fixture();
    const report = checkAndroidBuildEnvironment(fake.options);
    assert.equal(report.ready, true);
    assert.equal(report.mode, 'read-only');
    assert.ok(report.checks.every(check => check.status === 'pass'));
    assert.equal(report.installationGate.status, 'not-verified');
    assert.equal(report.installationGate.sharesLegacyApplicationId, true);
    assert.equal(report.installationGate.versionCode, 1);
    assert.deepEqual(fake.commands.map(call => call.args), [['-version'], ['-version'], ['version']]);
    assert.ok(fake.commands.every(call => /\/(?:java|javac|adb)$/.test(call.command)));
});

test('Node, Java runtime and Java compiler failures are distinct from SDK readiness', () => {
    const fake = fixture();
    fake.options.nodeVersion = '20.0.0';
    fake.options.runCommand = command => basename(command) === 'java'
        ? { status: 0, stderr: 'openjdk version "17.0.9"' }
        : basename(command) === 'javac' ? { status: 1, stderr: 'private error' }
            : { status: 0, stdout: 'Android Debug Bridge version 1.0.41' };
    const report = checkAndroidBuildEnvironment(fake.options);
    assert.equal(report.ready, false);
    assert.equal(getCheck(report, 'node').status, 'blocked');
    assert.equal(getCheck(report, 'jdk').status, 'blocked');
    assert.equal(getCheck(report, 'android-sdk').status, 'pass');
});

test('missing SDK, incomplete build tools or failed adb version never report ready', () => {
    for (const path of ['platforms/android-36/android.jar', 'build-tools/36.0.0/aapt2', 'platform-tools/adb']) {
        const fake = fixture();
        fake.files.delete(join(fake.sdk, path));
        assert.equal(checkAndroidBuildEnvironment(fake.options).ready, false, path);
    }
    const fake = fixture();
    const run = fake.options.runCommand;
    fake.options.runCommand = (command, args) => basename(command) === 'adb'
        ? { status: 1, stderr: 'device-serial-private-detail' } : run(command, args);
    assert.equal(getCheck(checkAndroidBuildEnvironment(fake.options), 'adb').status, 'blocked');
});

test('SDK license acceptance must match the installed package license rather than any hash', () => {
    const fake = fixture();
    fake.files.set(join(fake.sdk, 'licenses/android-sdk-license'), '0'.repeat(40));
    const report = checkAndroidBuildEnvironment(fake.options);
    assert.equal(report.ready, false);
    assert.equal(getCheck(report, 'sdk-licenses').status, 'blocked');
    fake.files.delete(join(fake.sdk, 'platform-tools/package.xml'));
    assert.equal(getCheck(checkAndroidBuildEnvironment(fake.options), 'sdk-licenses').status, 'unknown');
    assert.ok(fake.commands.every(call => !call.command.includes('sdkmanager')));
});

test('license XML decoding is verified and unexpected references cannot escape the license directory', () => {
    const text = 'Terms & conditions.\nLine two.';
    const good = '<repository><license id="android-sdk-license">Terms &amp; conditions.\nLine two.</license>'
        + '<uses-license ref="android-sdk-license"/></repository>';
    const accepted = createHash('sha1').update(text).digest('hex');
    assert.equal(inspectSdkLicenses([good], () => accepted).status, 'pass');
    const reads = [];
    const bad = '<license id="../../private">sensitive</license><uses-license ref="../../private"/>';
    assert.equal(inspectSdkLicenses([bad], id => { reads.push(id); return accepted; }).status, 'unknown');
    assert.equal(reads.length, 0);
});

test('SDK root conflicts and stale copied web assets require correction', () => {
    const fake = fixture();
    fake.options.env.ANDROID_SDK_ROOT = '/different-private/sdk';
    let report = checkAndroidBuildEnvironment(fake.options);
    assert.equal(getCheck(report, 'android-sdk').status, 'blocked');
    fake.options.env.ANDROID_SDK_ROOT = fake.sdk;
    fake.files.set(join(fake.rootDirectory, 'app-shell/android/app/src/main/assets/public/index.html'), 'stale native bundle');
    report = checkAndroidBuildEnvironment(fake.options);
    assert.equal(getCheck(report, 'project-ready').status, 'blocked');
    assert.equal(report.ready, false);
});

test('the repository-scoped toolchain is detected without printing its paths', () => {
    const fake = fixture();
    const tools = join(fake.rootDirectory, 'app-shell/.toolchain');
    const localJava = join(tools, 'java/jdk-21.0.12.1+1/Contents/Home');
    const localSdk = join(tools, 'android-sdk');
    fake.files.set(join(localJava, 'bin/java'), '');
    for (const [path, value] of [...fake.files]) {
        const sdkRelativePath = relative(fake.sdk, path);
        if (sdkRelativePath && !isAbsolute(sdkRelativePath) && !sdkRelativePath.startsWith('..')) {
            fake.files.set(join(localSdk, sdkRelativePath), value);
        }
    }
    fake.options.env = {};
    const report = checkAndroidBuildEnvironment(fake.options);
    assert.equal(report.ready, true);
    assert.equal(fake.commands[0].command, join(localJava, 'bin/java').replaceAll('\\', '/'));
    assert.equal(JSON.stringify(report).includes(localJava), false);
    assert.equal(JSON.stringify(report).includes(localSdk), false);
});

test('project-specific toolchain overrides work without inheriting unrelated SDK locations', () => {
    const fake = fixture();
    fake.options.env = { IKKYEE_JAVA_HOME: fake.jdk, IKKYEE_ANDROID_SDK: fake.sdk,
        JAVA_HOME: '/unrelated-private/jdk', ANDROID_HOME: '/unrelated-private/sdk' };
    assert.equal(checkAndroidBuildEnvironment(fake.options).ready, true);
    assert.equal(fake.commands[0].command, join(fake.jdk, 'bin/java').replaceAll('\\', '/'));
});

test('project SDK, wrapper or build-tools drift cannot be hidden by an installed toolchain', () => {
    for (const [path, contents] of [
        ['app-shell/android/variables.gradle', 'minSdkVersion=24\ncompileSdkVersion=35\ntargetSdkVersion=36'],
        ['app-shell/android/app/build.gradle', 'applicationId "com.ikkyee.mobile"\nversionCode 1'],
        ['app-shell/android/gradle/wrapper/gradle-wrapper.properties', 'distributionUrl=https://services.gradle.org/distributions/gradle-7.0-all.zip']
    ]) {
        const fake = fixture();
        fake.files.set(join(fake.rootDirectory, path), contents);
        assert.equal(getCheck(checkAndroidBuildEnvironment(fake.options), 'project-ready').status, 'blocked');
    }
});

test('the APK application ID must match the identity used in build evidence', () => {
    const fake = fixture();
    fake.files.set(join(fake.rootDirectory, 'app-shell/android/app/build.gradle'),
        'buildToolsVersion = "36.0.0"\napplicationId "com.ikkyee.other"\nversionCode 1');
    const report = checkAndroidBuildEnvironment(fake.options);
    assert.equal(report.ready, false);
    assert.equal(getCheck(report, 'project-ready').status, 'blocked');
});

test('the Capacitor app ID must match the identity used in build evidence', () => {
    const fake = fixture();
    fake.files.set(join(fake.rootDirectory, 'capacitor.config.json'),
        JSON.stringify({ appId: 'com.ikkyee.other', android: { path: 'app-shell/android' } }));
    const report = checkAndroidBuildEnvironment(fake.options);
    assert.equal(report.ready, false);
    assert.equal(getCheck(report, 'project-ready').status, 'blocked');
});

test('reports exclude environment paths, raw command errors, credentials and device serials', () => {
    const fake = fixture();
    fake.options.runCommand = () => ({ status: 1,
        stdout: '/synthetic-private/jdk', stderr: 'private-credential device-serial-private-detail' });
    const serialized = JSON.stringify(checkAndroidBuildEnvironment(fake.options));
    for (const secret of ['/synthetic-private', 'private-credential', 'device-serial-private-detail']) {
        assert.equal(serialized.includes(secret), false);
    }
    assert.equal(fake.reads.some(path => /\.(?:jks|keystore)$|signing\.properties/.test(path)), false);
});
