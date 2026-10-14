import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('Android registers only the exact custom OAuth callback and preserves the launcher', () => {
    const manifest = read('app-shell/android/app/src/main/AndroidManifest.xml');
    const filters = [...manifest.matchAll(/<intent-filter\b[^>]*>([\s\S]*?)<\/intent-filter>/g)]
        .map(match => match[1]);
    assert.equal(filters.length, 2);
    assert.ok(filters.some(filter => filter.includes('android.intent.action.MAIN')
        && filter.includes('android.intent.category.LAUNCHER')));
    const callback = filters.find(filter => filter.includes('android.intent.action.VIEW'));
    assert.ok(callback);
    assert.match(callback, /android.intent.category.DEFAULT/);
    assert.match(callback, /android.intent.category.BROWSABLE/);
    assert.match(callback, /<data\s+android:scheme="ikkyee"\s+android:host="auth"\s+android:path="\/callback"\s*\/>/);
    assert.equal((callback.match(/<data\b/g) || []).length, 1);
    assert.doesNotMatch(manifest, /android:autoVerify|android:scheme="https?"|android:pathPrefix/);
    assert.match(manifest, /android:launchMode="singleTask"/);
});

test('iOS exposes the Ikkyee URL scheme and keeps Capacitor forwarding enabled', () => {
    const plist = read('app-shell/ios/App/App/Info.plist');
    const urlTypes = plist.match(/<key>CFBundleURLTypes<\/key>\s*<array>([\s\S]*?)<\/array>\s*<\/dict>\s*<\/array>/)?.[1];
    assert.ok(urlTypes);
    assert.match(urlTypes, /<key>CFBundleURLName<\/key>\s*<string>com\.ikkyee\.mobile\.auth<\/string>/);
    assert.match(urlTypes, /<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>ikkyee<\/string>/);
    assert.doesNotMatch(plist, /applinks:|NSAllowsArbitraryLoads/);
    const delegate = read('app-shell/ios/App/App/AppDelegate.swift');
    assert.match(delegate, /ApplicationDelegateProxy\.shared\.application\(app, open: url, options: options\)/);
});

test('Android cloud backups and device transfers exclude all app data domains', () => {
    const manifest = read('app-shell/android/app/src/main/AndroidManifest.xml');
    assert.match(manifest, /android:allowBackup="false"/);
    assert.match(manifest, /android:fullBackupContent="@xml\/backup_rules"/);
    assert.match(manifest, /android:dataExtractionRules="@xml\/data_extraction_rules"/);
    const domains = ['root', 'file', 'database', 'sharedpref', 'external',
        'device_root', 'device_file', 'device_database', 'device_sharedpref'];
    const legacy = read('app-shell/android/app/src/main/res/xml/backup_rules.xml');
    const rules = read('app-shell/android/app/src/main/res/xml/data_extraction_rules.xml');
    for (const section of ['cloud-backup', 'device-transfer']) {
        const content = rules.match(new RegExp(`<${section}\\b[^>]*>([\\s\\S]*?)<\\/${section}>`))?.[1];
        assert.ok(content, section);
        assert.doesNotMatch(content, /<include\b/);
        for (const domain of domains) assert.match(content, new RegExp(`<exclude domain="${domain}" path="\\."\\s*\\/>`));
    }
    for (const domain of domains) assert.match(legacy, new RegExp(`<exclude domain="${domain}" path="\\."\\s*\\/>`));
});

test('signing credentials and local native build outputs are excluded from version control', () => {
    const androidIgnore = read('app-shell/android/.gitignore');
    const iosIgnore = read('app-shell/ios/.gitignore');
    for (const pattern of ['*.jks', '*.keystore', 'keystore.properties', 'signing.properties']) {
        assert.ok(androidIgnore.split(/\r?\n/).includes(pattern), pattern);
    }
    for (const pattern of ['*.p12', '*.pfx', '*.mobileprovision', '*.provisionprofile', '*.ipa', '*.xcarchive']) {
        assert.ok(iosIgnore.split(/\r?\n/).includes(pattern), pattern);
    }
    assert.ok(androidIgnore.includes('app/src/main/assets/public'));
    assert.ok(iosIgnore.includes('App/App/public'));
});

test('Filesystem timestamp reason is declared and bundled in the iOS application target', () => {
    const manifest = read('app-shell/ios/App/App/PrivacyInfo.xcprivacy');
    assert.match(manifest, /<key>NSPrivacyAccessedAPIType<\/key>\s*<string>NSPrivacyAccessedAPICategoryFileTimestamp<\/string>/);
    assert.match(manifest, /<key>NSPrivacyAccessedAPITypeReasons<\/key>\s*<array>\s*<string>C617\.1<\/string>/);
    // This required-reason manifest does not pretend to describe the service's
    // separate App Store data-collection disclosure.
    assert.doesNotMatch(manifest, /NSPrivacyTracking|NSPrivacyCollectedDataTypes/);
    const project = read('app-shell/ios/App/App.xcodeproj/project.pbxproj');
    assert.match(project, /PrivacyInfo\.xcprivacy.*isa = PBXFileReference/);
    assert.match(project, /PrivacyInfo\.xcprivacy in Resources.*isa = PBXBuildFile/);
    const resources = project.match(/\/\* Begin PBXResourcesBuildPhase section \*\/([\s\S]*?)\/\* End PBXResourcesBuildPhase section \*\//)?.[1];
    assert.match(resources, /PrivacyInfo\.xcprivacy in Resources/);
});

test('native launch screens use the approved raster without cropping or template art', () => {
    const theme = read('app-shell/android/app/src/main/res/values/styles.xml');
    assert.match(theme, /<item name="windowSplashScreenAnimatedIcon">@mipmap\/ic_launcher_foreground<\/item>/);
    assert.match(theme, /<item name="windowSplashScreenBackground">@color\/ikkyee_launch_background<\/item>/);
    assert.match(theme, /<item name="postSplashScreenTheme">@style\/AppTheme\.NoActionBar<\/item>/);
    const background = read('app-shell/android/app/src/main/res/values/ic_launcher_background.xml');
    assert.match(background, /#F9F7F2/);
    const oldForeground = read('app-shell/android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml');
    assert.match(oldForeground, /@mipmap\/ic_launcher_foreground/);
    assert.doesNotMatch(oldForeground, /pathData/);
    const launch = read('app-shell/ios/App/App/Base.lproj/LaunchScreen.storyboard');
    assert.match(launch, /contentMode="scaleAspectFit"/);
    assert.doesNotMatch(launch, /contentMode="scaleAspectFill"/);
    assert.match(launch, /firstAttribute="centerX"/);
    assert.match(launch, /firstAttribute="centerY"/);
    assert.match(launch, /firstAttribute="width" constant="180"/);
    assert.match(launch, /firstAttribute="height" constant="180"/);
});

test('Android device-test context targets Ikkyee rather than the Capacitor template identifier', () => {
    const source = read('app-shell/android/app/src/androidTest/java/com/ikkyee/mobile/ExampleInstrumentedTest.java');
    assert.match(source, /package com\.ikkyee\.mobile;/);
    assert.match(source, /assertEquals\("com\.ikkyee\.mobile", appContext\.getPackageName\(\)\)/);
    assert.doesNotMatch(source, /com\.getcapacitor\.(?:app|myapp)/);
});
