import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { test } from 'node:test';

import { verifyAndroidApk } from '../scripts/verify-android-apk.mjs';

// Tiny ZIP fixtures exercise real stored/deflated APK asset entries. Native
// manifest/signature commands are injected, not represented as physical tests.
function zip(entries) {
    const records = [];
    const directory = [];
    let offset = 0;
    for (const { path, value = '', compression = 0, descriptor = false } of entries) {
        const name = Buffer.from(path);
        const contents = Buffer.from(value);
        const data = compression === 8 ? deflateRawSync(contents) : contents;
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(descriptor ? 8 : 0, 6);
        local.writeUInt16LE(compression, 8);
        local.writeUInt32LE(descriptor ? 0 : data.length, 18);
        local.writeUInt32LE(descriptor ? 0 : contents.length, 22);
        local.writeUInt16LE(name.length, 26);
        records.push(local, name, data);
        if (descriptor) {
            const footer = Buffer.alloc(16);
            footer.writeUInt32LE(0x08074b50);
            footer.writeUInt32LE(data.length, 8);
            footer.writeUInt32LE(contents.length, 12);
            records.push(footer);
        }
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(descriptor ? 8 : 0, 8);
        central.writeUInt16LE(compression, 10);
        central.writeUInt32LE(data.length, 20);
        central.writeUInt32LE(contents.length, 24);
        central.writeUInt16LE(name.length, 28);
        central.writeUInt32LE(offset, 42);
        directory.push(central, name);
        offset += local.length + name.length + data.length + (descriptor ? 16 : 0);
    }
    const central = Buffer.concat(directory);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(central.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...records, central, end]);
}

function fixture() {
    const apkPath = resolve('/synthetic-private/app.apk');
    const sdkPath = resolve('/synthetic-private/sdk');
    const bundleDirectory = resolve('/synthetic-private/www');
    const sources = new Map([
        ['index.html', Buffer.from('<html>native fixture</html>')],
        ['assets/app.js', Buffer.from('fixture JavaScript')],
        ['assets/style.css', Buffer.from('fixture CSS')]
    ]);
    const archiveEntries = [
        { path: 'AndroidManifest.xml', value: 'binary manifest fixture' },
        ...[...sources].map(([path, value]) => ({ path: 'assets/public/' + path, value,
            compression: path.endsWith('.js') ? 8 : 0 })),
        { path: 'assets/public/cordova.js', value: '' },
        { path: 'assets/public/cordova_plugins.js', value: '' }
    ];
    let apkBytes = zip(archiveEntries);
    const commands = [];
    const reads = [];
    const outputs = {
        badging: "package: name='com.ikkyee.mobile' versionCode='1' versionName='1.0'\nminSdkVersion:'24'\ntargetSdkVersion:'36'\napplication-debuggable\n",
        signature: 'Verifies\nVerified using v1 scheme (JAR signing): true\nVerified using v2 scheme (APK Signature Scheme v2): true\nNumber of signers: 1\nSigner #1 certificate SHA-256 digest: ' + 'a'.repeat(64) + '\n'
    };
    const options = {
        apkPath, sdkPath, bundleDirectory, platform: 'darwin',
        env: { JAVA_HOME: '/synthetic-private/jdk' },
        exists: () => true,
        listFiles: () => [...sources.keys()],
        readFile: path => {
            reads.push(path);
            if (path === apkPath) return apkBytes;
            const relative = path.slice(bundleDirectory.length + 1);
            if (!sources.has(relative)) throw new Error('private filesystem detail');
            return sources.get(relative);
        },
        runCommand: (command, args) => {
            commands.push({ command, args });
            return { status: 0, stdout: command.endsWith('/aapt2') ? outputs.badging : outputs.signature };
        },
        now: () => new Date('2026-10-14T00:00:00Z')
    };
    return { options, sources, archiveEntries, outputs, commands, reads,
        setArchive: entries => { apkBytes = zip(entries); }, setBytes: value => { apkBytes = value; } };
}

function safeError(error) {
    assert.equal(error.name, 'AndroidApkVerificationError');
    assert.equal('cause' in error, false);
    assert.equal(error.message.includes('synthetic-private'), false);
    assert.equal(error.message.includes('private filesystem detail'), false);
    return true;
}

test('APK verification checks native manifest, signature and every packed web file before success', () => {
    const fake = fixture();
    const evidence = verifyAndroidApk(fake.options);
    assert.equal(evidence.verified, true);
    assert.equal(evidence.applicationId, 'com.ikkyee.mobile');
    assert.equal(evidence.versionCode, 1);
    assert.equal(evidence.minSdkVersion, 24);
    assert.equal(evidence.targetSdkVersion, 36);
    assert.equal(evidence.debuggable, true);
    assert.equal(evidence.apkSignatureVerified, true);
    assert.equal(evidence.packagedBundleVerified, true);
    assert.equal(evidence.webBundle.fileCount, 3);
    assert.equal(evidence.webBundle.runtimeStubs.length, 2);
    assert.equal(evidence.installedDeviceVerified, false);
    assert.equal(evidence.upgradeVerified, false);
    assert.equal(evidence.verifiedAt, '2026-10-14T00:00:00.000Z');
    assert.match(evidence.sha256, /^[a-f\d]{64}$/);
    assert.deepEqual(fake.commands.map(call => call.args.slice(0, -1)), [
        ['dump', 'badging'], ['verify', '--verbose', '--print-certs']
    ]);
});

test('different package, version, minimum/target SDK or release build cannot pass the debug contract', () => {
    for (const [before, after] of [
        ["name='com.ikkyee.mobile'", "name='com.ikkyee.other'"],
        ["versionCode='1'", "versionCode='2'"],
        ["minSdkVersion:'24'", "minSdkVersion:'23'"],
        ["targetSdkVersion:'36'", "targetSdkVersion:'35'"],
        ['application-debuggable\n', '']
    ]) {
        const fake = fixture();
        fake.outputs.badging = fake.outputs.badging.replace(before, after);
        assert.throws(() => verifyAndroidApk(fake.options), safeError);
    }
});

test('actual AAPT2 SDK labels are required once and ambiguous badging output is rejected', () => {
    for (const mutate of [
        text => text.replace("minSdkVersion:'24'", "sdkVersion:'24'"),
        text => text + "minSdkVersion:'24'\n",
        text => text + "minSdkVersion:'23'\n",
        text => text + "targetSdkVersion:'35'\n",
        text => text + "package: name='com.ikkyee.mobile' versionCode='1'\n"
    ]) {
        const fake = fixture();
        fake.outputs.badging = mutate(fake.outputs.badging);
        assert.throws(() => verifyAndroidApk(fake.options), safeError);
    }
});

test('failed signature command or incomplete success output cannot verify an APK', () => {
    for (const signature of ['', 'Does not verify\n', 'Verifies\nNumber of signers: 0\n']) {
        const fake = fixture();
        fake.outputs.signature = signature;
        assert.throws(() => verifyAndroidApk(fake.options), safeError);
    }
    const fake = fixture();
    const run = fake.options.runCommand;
    fake.options.runCommand = (command, args) => command.endsWith('/apksigner')
        ? { status: 1, stderr: 'private filesystem detail' } : run(command, args);
    assert.throws(() => verifyAndroidApk(fake.options), safeError);
});

test('missing, added and changed packed web files are rejected', () => {
    for (const change of [
        entries => entries.filter(entry => entry.path !== 'assets/public/assets/app.js'),
        entries => [...entries, { path: 'assets/public/old.js', value: 'stale bundle' }],
        entries => entries.map(entry => entry.path === 'assets/public/index.html' ? { ...entry, value: 'stale index' } : entry)
    ]) {
        const fake = fixture();
        fake.setArchive(change(fake.archiveEntries));
        assert.throws(() => verifyAndroidApk(fake.options), safeError);
    }
});

test('only named empty Capacitor Cordova stubs are admitted beyond the Vite bundle', () => {
    const fake = fixture();
    fake.setArchive(fake.archiveEntries.map(entry => entry.path === 'assets/public/cordova.js'
        ? { ...entry, value: 'unexpected code' } : entry));
    assert.throws(() => verifyAndroidApk(fake.options), safeError);
});

test('duplicate ZIP files, traversal paths, malformed or unsupported compressed archives are rejected', () => {
    for (const change of [
        entries => [...entries, { path: 'assets/public/index.html', value: 'duplicate' }],
        entries => [...entries, { path: 'assets/public/../private', value: 'bad path' }],
        entries => entries.map(entry => entry.path === 'assets/public/assets/app.js' ? { ...entry, compression: 99 } : entry)
    ]) {
        const fake = fixture();
        fake.setArchive(change(fake.archiveEntries));
        assert.throws(() => verifyAndroidApk(fake.options), safeError);
    }
    const fake = fixture();
    fake.setBytes(Buffer.from('not an APK ZIP'));
    assert.throws(() => verifyAndroidApk(fake.options), safeError);
});

test('an APK changed during SDK verification cannot inherit mixed signature and bundle evidence', () => {
    const fake = fixture();
    const run = fake.options.runCommand;
    fake.options.runCommand = (command, args) => {
        const result = run(command, args);
        if (command.endsWith('/apksigner')) fake.setArchive([...fake.archiveEntries, { path: 'changed', value: 'different APK' }]);
        return result;
    };
    assert.throws(() => verifyAndroidApk(fake.options), safeError);
});

test('APK signing blocks and ZIP data descriptors do not prevent exact bundle verification', () => {
    const fake = fixture();
    const bytes = zip(fake.archiveEntries.map(entry => ({ ...entry, descriptor: true })));
    const end = bytes.length - 22;
    const centralOffset = bytes.readUInt32LE(end + 16);
    const signingBlock = Buffer.from('synthetic APK signing block');
    const signedShape = Buffer.concat([bytes.subarray(0, centralOffset), signingBlock, bytes.subarray(centralOffset)]);
    signedShape.writeUInt32LE(centralOffset + signingBlock.length, signedShape.length - 22 + 16);
    fake.setBytes(signedShape);
    assert.equal(verifyAndroidApk(fake.options).packagedBundleVerified, true);
});

test('a bundle changed during verification cannot receive success evidence', () => {
    const fake = fixture();
    const read = fake.options.readFile;
    let apkReads = 0;
    fake.options.readFile = path => {
        if (path === fake.options.apkPath && ++apkReads === 2) fake.sources.set('assets/app.js', Buffer.from('changed source'));
        return read(path);
    };
    assert.throws(() => verifyAndroidApk(fake.options), safeError);
});

test('bundle enumeration adapters are treated as immutable input', () => {
    const fake = fixture();
    fake.options.listFiles = () => Object.freeze([...fake.sources.keys()]);
    assert.equal(verifyAndroidApk(fake.options).verified, true);
});

test('source file paths cannot escape the bundle or read signing material', () => {
    const fake = fixture();
    fake.options.listFiles = () => ['../private.keystore'];
    assert.throws(() => verifyAndroidApk(fake.options), safeError);
    assert.equal(fake.reads.some(path => path.includes('keystore')), false);
});

test('evidence contains fingerprints, not paths, source contents or raw tool output', () => {
    const fake = fixture();
    const evidence = verifyAndroidApk(fake.options);
    const serialized = JSON.stringify(evidence);
    for (const secret of ['synthetic-private', '<html>', 'fixture JavaScript', 'Installed as', 'private filesystem detail']) {
        assert.equal(serialized.includes(secret), false);
    }
    assert.equal(evidence.webBundle.indexSha256,
        createHash('sha256').update(fake.sources.get('index.html')).digest('hex'));
});

test('missing SDK tools and raw filesystem/process failures remain safe verification failures', () => {
    const fake = fixture();
    fake.options.exists = () => false;
    assert.throws(() => verifyAndroidApk(fake.options), safeError);
    fake.options.exists = () => true;
    fake.options.readFile = () => { throw new Error('private filesystem detail'); };
    assert.throws(() => verifyAndroidApk(fake.options), safeError);
    fake.options.readFile = () => Buffer.from('bad archive');
    fake.options.runCommand = () => { throw new Error('private filesystem detail'); };
    assert.throws(() => verifyAndroidApk(fake.options), safeError);
    assert.equal(fake.commands.some(call => call.command.includes('adb')), false);
});
