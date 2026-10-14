import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MAX_APK_BYTES = 512 * 1024 * 1024;
const MAX_BUNDLE_BYTES = 128 * 1024 * 1024;
const PUBLIC_PREFIX = 'assets/public/';
const EMPTY_RUNTIME_STUBS = new Set(['cordova.js', 'cordova_plugins.js']);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const MESSAGES = {
    APK_TOOLS_UNAVAILABLE: 'APK 검증에 필요한 Android Build Tools를 확인하지 못했습니다.',
    APK_MANIFEST_MISMATCH: 'APK의 앱 식별자·버전·지원 OS 또는 디버그 설정이 시험 빌드와 다릅니다.',
    APK_SIGNATURE_INVALID: 'APK 서명을 확인하지 못했습니다. 검증된 빌드를 다시 생성해주세요.',
    APK_ARCHIVE_INVALID: 'APK 내부 파일 구조를 확인하지 못했습니다.',
    APK_WEB_BUNDLE_MISMATCH: 'APK에 담긴 웹 파일이 현재 앱 빌드와 다릅니다. 다시 동기화·빌드해주세요.',
    APK_CHANGED_DURING_VERIFICATION: '검증 중 APK 또는 앱 빌드가 변경되어 결과를 확정하지 않았습니다.',
    APK_VERIFICATION_FAILED: 'APK 검증을 완료하지 못했습니다. 빌드 도구와 산출물을 확인해주세요.'
};

export class AndroidApkVerificationError extends Error {
    constructor(code = 'APK_VERIFICATION_FAILED') {
        super(MESSAGES[code] || MESSAGES.APK_VERIFICATION_FAILED);
        this.name = 'AndroidApkVerificationError';
        this.code = Object.hasOwn(MESSAGES, code) ? code : 'APK_VERIFICATION_FAILED';
    }
}

function requireValid(condition, code) {
    if (!condition) throw new AndroidApkVerificationError(code);
}

function safeRelativePath(path) {
    return typeof path === 'string' && path.length > 0 && !/[\\:\u0000-\u001f\u007f]/u.test(path)
        && !path.startsWith('/') && path.split('/').every(part => part && part !== '.' && part !== '..');
}

function listBundleFiles(directory) {
    const files = [];
    const walk = (absolute, relative = '') => {
        for (const entry of readdirSync(absolute, { withFileTypes: true })) {
            const next = relative ? `${relative}/${entry.name}` : entry.name;
            if (entry.isDirectory()) walk(join(absolute, entry.name), next);
            else if (entry.isFile()) files.push(next);
            else throw new AndroidApkVerificationError('APK_WEB_BUNDLE_MISMATCH');
        }
    };
    walk(directory);
    return files.sort();
}

function readBundle(directory, listFiles, readFile) {
    const files = listFiles(directory);
    requireValid(Array.isArray(files) && files.length > 0 && files.every(safeRelativePath)
        && new Set(files).size === files.length && files.includes('index.html'), 'APK_WEB_BUNDLE_MISMATCH');
    let bytes = 0;
    const entries = [...files].sort().map(path => {
        const contents = readFile(join(directory, path));
        requireValid(Buffer.isBuffer(contents), 'APK_WEB_BUNDLE_MISMATCH');
        bytes += contents.length;
        requireValid(bytes <= MAX_BUNDLE_BYTES, 'APK_WEB_BUNDLE_MISMATCH');
        return { path, bytes: contents.length, sha256: digest(contents) };
    });
    return { entries, bytes, manifestSha256: digest(JSON.stringify(entries)) };
}

function readZipEntries(apk) {
    const valid = condition => requireValid(condition, 'APK_ARCHIVE_INVALID');
    valid(Buffer.isBuffer(apk) && apk.length >= 22 && apk.length <= MAX_APK_BYTES);
    let end = -1;
    for (let offset = apk.length - 22; offset >= Math.max(0, apk.length - 22 - 65535); offset -= 1) {
        if (apk.readUInt32LE(offset) === 0x06054b50 && offset + 22 + apk.readUInt16LE(offset + 20) === apk.length) {
            end = offset;
            break;
        }
    }
    valid(end >= 0);
    const count = apk.readUInt16LE(end + 10);
    const directorySize = apk.readUInt32LE(end + 12);
    const directoryOffset = apk.readUInt32LE(end + 16);
    valid(apk.readUInt16LE(end + 4) === 0 && apk.readUInt16LE(end + 6) === 0
        && apk.readUInt16LE(end + 8) === count && count !== 0xffff
        && directoryOffset !== 0xffffffff && directorySize !== 0xffffffff
        && directoryOffset + directorySize === end);
    const range = (offset, length, limit = apk.length) => valid(Number.isSafeInteger(offset)
        && Number.isSafeInteger(length) && offset >= 0 && length >= 0 && offset + length <= limit);
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const entries = new Map();
    let offset = directoryOffset;
    for (let index = 0; index < count; index += 1) {
        range(offset, 46, end);
        valid(apk.readUInt32LE(offset) === 0x02014b50);
        const filenameLength = apk.readUInt16LE(offset + 28);
        const extraLength = apk.readUInt16LE(offset + 30);
        const commentLength = apk.readUInt16LE(offset + 32);
        range(offset + 46, filenameLength + extraLength + commentLength, end);
        const name = decoder.decode(apk.subarray(offset + 46, offset + 46 + filenameLength));
        valid(!entries.has(name) && safeRelativePath(name.endsWith('/') ? name.slice(0, -1) : name));
        const flags = apk.readUInt16LE(offset + 8);
        const compression = apk.readUInt16LE(offset + 10);
        const compressedSize = apk.readUInt32LE(offset + 20);
        const size = apk.readUInt32LE(offset + 24);
        const localOffset = apk.readUInt32LE(offset + 42);
        const mode = apk.readUInt32LE(offset + 38) >>> 16;
        valid(apk.readUInt16LE(offset + 34) === 0 && compressedSize !== 0xffffffff
            && size !== 0xffffffff && localOffset !== 0xffffffff);
        entries.set(name, { name, flags, compression, compressedSize, size, localOffset,
            symbolicLink: (mode & 0o170000) === 0o120000 });
        offset += 46 + filenameLength + extraLength + commentLength;
    }
    valid(offset === end);
    const readEntry = entry => {
        valid(!entry.symbolicLink && !(entry.flags & 1) && [0, 8].includes(entry.compression)
            && entry.size <= MAX_BUNDLE_BYTES);
        range(entry.localOffset, 30, directoryOffset);
        valid(apk.readUInt32LE(entry.localOffset) === 0x04034b50);
        const nameLength = apk.readUInt16LE(entry.localOffset + 26);
        const extraLength = apk.readUInt16LE(entry.localOffset + 28);
        range(entry.localOffset + 30, nameLength + extraLength, directoryOffset);
        const localName = decoder.decode(apk.subarray(entry.localOffset + 30, entry.localOffset + 30 + nameLength));
        valid(localName === entry.name && apk.readUInt16LE(entry.localOffset + 6) === entry.flags
            && apk.readUInt16LE(entry.localOffset + 8) === entry.compression);
        const dataOffset = entry.localOffset + 30 + nameLength + extraLength;
        range(dataOffset, entry.compressedSize, directoryOffset);
        const compressed = apk.subarray(dataOffset, dataOffset + entry.compressedSize);
        const contents = entry.compression === 0 ? compressed
            : inflateRawSync(compressed, { maxOutputLength: Math.max(1, entry.size) });
        valid(contents.length === entry.size);
        return contents;
    };
    return { entries, readEntry };
}

function parseBadging(text) {
    const lines = text.split(/\r?\n/);
    const packageLines = lines.filter(line => line.startsWith('package:'));
    const minimumLines = lines.filter(line => line.startsWith('minSdkVersion:'));
    const targetLines = lines.filter(line => line.startsWith('targetSdkVersion:'));
    const packageLine = packageLines[0] || '';
    const applicationId = packageLine.match(/\bname='([^']+)'/)?.[1];
    const versionCode = Number(packageLine.match(/\bversionCode='(\d+)'/)?.[1]);
    const minSdkVersion = Number(minimumLines[0]?.match(/^minSdkVersion:'(\d+)'\s*$/)?.[1]);
    const targetSdkVersion = Number(targetLines[0]?.match(/^targetSdkVersion:'(\d+)'\s*$/)?.[1]);
    const debuggable = /^application-debuggable\s*$/m.test(text);
    requireValid(packageLines.length === 1 && minimumLines.length === 1 && targetLines.length === 1
        && applicationId === 'com.ikkyee.mobile'
        && versionCode === 1 && minSdkVersion === 24 && targetSdkVersion === 36 && debuggable,
    'APK_MANIFEST_MISMATCH');
    return { applicationId, versionCode, minSdkVersion, targetSdkVersion, debuggable };
}

function parseSignature(text) {
    const signerCount = Number(text.match(/^Number of signers:\s*(\d+)\s*$/m)?.[1]);
    const certificates = [...text.matchAll(/^Signer #(\d+) certificate SHA-256 digest:\s*([a-f\d:]+)\s*$/gmi)]
        .map(match => ({ signer: Number(match[1]), sha256: match[2].replaceAll(':', '').toLowerCase() }));
    requireValid(/^Verifies\s*$/m.test(text) && Number.isInteger(signerCount) && signerCount > 0
        && certificates.length === signerCount && new Set(certificates.map(cert => cert.signer)).size === signerCount
        && certificates.every(cert => cert.signer >= 1 && cert.signer <= signerCount && /^[a-f\d]{64}$/.test(cert.sha256)),
    'APK_SIGNATURE_INVALID');
    return { verified: true, signerCount, certificateSha256: certificates.sort((a, b) => a.signer - b.signer).map(cert => cert.sha256) };
}

function runReadOnlyTool(command, args, { env }) {
    return spawnSync(command, args, { env, encoding: 'utf8', timeout: 30000,
        maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false });
}

/** Verifies an existing artifact; never builds, signs, installs or changes it. */
export function verifyAndroidApk({
    apkPath = join(ROOT, 'app-shell/artifacts/android/ikkyee-android-debug.apk'),
    sdkPath = process.env.IKKYEE_ANDROID_SDK || process.env.ANDROID_HOME || join(ROOT, 'app-shell/.toolchain/android-sdk'),
    bundleDirectory = join(ROOT, 'app-shell/www'),
    env = process.env,
    platform = process.platform,
    exists = existsSync,
    readFile = readFileSync,
    listFiles = listBundleFiles,
    runCommand = runReadOnlyTool,
    now = () => new Date()
} = {}) {
    try {
        const toolDirectory = join(sdkPath, 'build-tools/36.0.0');
        const aapt = join(toolDirectory, platform === 'win32' ? 'aapt2.exe' : 'aapt2');
        const signer = join(toolDirectory, platform === 'win32' ? 'apksigner.bat' : 'apksigner');
        requireValid(exists(apkPath) && exists(aapt) && exists(signer), 'APK_TOOLS_UNAVAILABLE');
        const apk = readFile(apkPath);
        requireValid(Buffer.isBuffer(apk) && apk.length <= MAX_APK_BYTES, 'APK_ARCHIVE_INVALID');
        const sha256 = digest(apk);
        const environment = { ...env, JAVA_HOME: env.IKKYEE_JAVA_HOME || env.JAVA_HOME
            || join(ROOT, 'app-shell/.toolchain/java/jdk-21.0.12.1+1/Contents/Home') };
        const manifestResult = runCommand(aapt, ['dump', 'badging', apkPath], { env: environment });
        requireValid(manifestResult?.status === 0 && typeof manifestResult.stdout === 'string', 'APK_MANIFEST_MISMATCH');
        const manifest = parseBadging(manifestResult.stdout);
        const signatureResult = runCommand(signer, ['verify', '--verbose', '--print-certs', apkPath], { env: environment });
        requireValid(signatureResult?.status === 0 && typeof signatureResult.stdout === 'string', 'APK_SIGNATURE_INVALID');
        const signing = parseSignature(signatureResult.stdout);
        const bundle = readBundle(bundleDirectory, listFiles, readFile);
        const expected = new Map(bundle.entries.map(entry => [entry.path, entry]));
        const { entries, readEntry } = readZipEntries(apk);
        const packaged = [];
        const runtimeStubs = [];
        let bundleBytes = 0;
        for (const [path, entry] of entries) {
            if (!path.startsWith(PUBLIC_PREFIX) || path.endsWith('/')) continue;
            const relative = path.slice(PUBLIC_PREFIX.length);
            requireValid(safeRelativePath(relative), 'APK_WEB_BUNDLE_MISMATCH');
            const contents = readEntry(entry);
            bundleBytes += contents.length;
            requireValid(bundleBytes <= MAX_BUNDLE_BYTES, 'APK_WEB_BUNDLE_MISMATCH');
            if (!expected.has(relative)) {
                // Capacitor CLI creates these exact empty compatibility files
                // even without Cordova plugins. No other generated code is exempt.
                requireValid(EMPTY_RUNTIME_STUBS.has(relative) && contents.length === 0, 'APK_WEB_BUNDLE_MISMATCH');
                runtimeStubs.push({ path: relative, bytes: 0, sha256: digest(contents) });
                continue;
            }
            packaged.push({ path: relative, bytes: contents.length, sha256: digest(contents) });
        }
        packaged.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
        const packagedManifest = digest(JSON.stringify(packaged));
        requireValid(packaged.length === bundle.entries.length && packagedManifest === bundle.manifestSha256,
        'APK_WEB_BUNDLE_MISMATCH');
        requireValid(digest(readFile(apkPath)) === sha256
            && readBundle(bundleDirectory, listFiles, readFile).manifestSha256 === bundle.manifestSha256,
        'APK_CHANGED_DURING_VERIFICATION');
        return {
            schemaVersion: 1,
            verified: true,
            verifiedAt: now().toISOString(),
            ...manifest,
            sha256,
            bytes: apk.length,
            apkSignatureVerified: true,
            packagedBundleVerified: true,
            signing,
            webBundle: { fileCount: bundle.entries.length, bytes: bundle.bytes,
                manifestSha256: bundle.manifestSha256,
                indexSha256: expected.get('index.html').sha256,
                runtimeStubs: runtimeStubs.sort((a, b) => a.path.localeCompare(b.path)) },
            installedDeviceVerified: false,
            upgradeVerified: false
        };
    } catch (error) {
        if (error instanceof AndroidApkVerificationError) throw error;
        // Native tools/filesystem errors can contain paths, credentials or
        // certificate details. Do not preserve them as a cause or log payload.
        throw new AndroidApkVerificationError();
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        requireValid(process.argv.length <= 3, 'APK_VERIFICATION_FAILED');
        console.log(JSON.stringify(verifyAndroidApk({ apkPath: process.argv[2]
            ? resolve(process.argv[2]) : undefined }), null, 2));
    } catch (error) {
        console.error(error instanceof AndroidApkVerificationError ? error.message : MESSAGES.APK_VERIFICATION_FAILED);
        process.exitCode = 1;
    }
}
