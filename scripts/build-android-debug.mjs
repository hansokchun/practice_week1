import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));

function toolPath(value, fallback) {
    const path = value || fallback;
    if (!isAbsolute(path) || resolve(path) === '/' || /[\r\n\0]/u.test(path)) {
        throw new Error('빌드 도구에는 유효한 전용 폴더의 절대 경로가 필요합니다.');
    }
    return path;
}

/** This plan builds a local debug artifact; it never installs or publishes it. */
export function getAndroidDebugBuildPlan({ root = PROJECT_ROOT, environment = process.env } = {}) {
    const project = toolPath(root, PROJECT_ROOT);
    const tools = join(project, 'app-shell/.toolchain');
    const java = toolPath(environment.IKKYEE_JAVA_HOME, join(tools, 'java/jdk-21.0.12.1+1/Contents/Home'));
    const sdk = toolPath(environment.IKKYEE_ANDROID_SDK, join(tools, 'android-sdk'));
    const gradle = toolPath(environment.IKKYEE_GRADLE_HOME, join(tools, 'gradle'));
    return {
        root: project,
        command: join(project, 'app-shell/android/gradlew'),
        cwd: join(project, 'app-shell/android'),
        args: ['--no-daemon', '--console=plain', '--max-workers=2',
            ':app:testDebugUnitTest', ':app:lintDebug', ':app:assembleDebug'],
        environment: { ...environment, JAVA_HOME: java, ANDROID_HOME: sdk,
            ANDROID_SDK_ROOT: sdk, GRADLE_USER_HOME: gradle,
            ANDROID_USER_HOME: join(tools, 'android-user') },
        keytool: join(java, 'bin/keytool'),
        keystore: join(tools, 'android-user/debug.keystore'),
        sourceApk: join(project, 'app-shell/android/app/build/outputs/apk/debug/app-debug.apk'),
        artifact: join(project, 'app-shell/artifacts/android/ikkyee-android-debug.apk')
    };
}

function run(command, args, options) {
    const result = spawnSync(command, args, { ...options, stdio: 'inherit', shell: false });
    if (result.error) throw new Error('Android 빌드 도구를 실행하지 못했습니다. 준비 상태를 확인해주세요.');
    return result.status ?? 1;
}

export function buildAndroidDebug({
    runCommand = run, exists = existsSync, readBytes = readFileSync,
    makeDirectory = mkdirSync, copyFile = copyFileSync, writeFile = writeFileSync,
    now = () => new Date(), log = console.log, ...options
} = {}) {
    const plan = getAndroidDebugBuildPlan(options);
    const child = { cwd: plan.root, env: plan.environment };
    const ready = runCommand(process.execPath, [join(plan.root, 'scripts/check-android-build-environment.mjs')], child);
    if (ready !== 0) return ready;
    const inputBundleIndexSha256 = createHash('sha256')
        .update(readBytes(join(plan.root, 'app-shell/www/index.html'))).digest('hex');
    makeDirectory(plan.environment.ANDROID_USER_HOME, { recursive: true });
    if (!exists(plan.keystore)) {
        // Standard Android debug credentials, not a production signing key.
        const created = runCommand(plan.keytool, ['-genkeypair', '-keystore', plan.keystore,
            '-alias', 'androiddebugkey', '-storepass', 'android', '-keypass', 'android',
            '-dname', 'CN=Android Debug,O=Android,C=US', '-keyalg', 'RSA', '-keysize', '2048',
            '-validity', '10000'], child);
        if (created !== 0) return created;
    }
    const status = runCommand(plan.command, plan.args, { cwd: plan.cwd, env: plan.environment });
    if (status !== 0) return status;
    if (!exists(plan.sourceApk)) throw new Error('빌드는 종료됐지만 APK 파일을 확인하지 못했습니다.');
    const apk = readBytes(plan.sourceApk);
    const sha256 = createHash('sha256').update(apk).digest('hex');
    makeDirectory(join(plan.root, 'app-shell/artifacts/android'), { recursive: true });
    copyFile(plan.sourceApk, plan.artifact);
    writeFile(`${plan.artifact}.json`, `${JSON.stringify({
        artifact: 'ikkyee-android-debug.apk', applicationId: 'com.ikkyee.mobile',
        buildType: 'debug', sha256, bytes: apk.byteLength, createdAt: now().toISOString(), inputBundleIndexSha256,
        verification: ['testDebugUnitTest', 'lintDebug', 'assembleDebug'],
        apkSignatureVerified: false, packagedBundleVerified: false,
        installedDeviceVerified: false, upgradeVerified: false
    }, null, 2)}\n`);
    log('Android 시험 APK를 생성했습니다. APK 패키지·서명과 실기기 설치·로그인·지도·업데이트는 별도 검증해야 합니다.');
    log(plan.artifact);
    return 0;
}

export function checkAndroidDebugBuild(options = {}) {
    const plan = getAndroidDebugBuildPlan(options);
    return run(process.execPath, [join(plan.root, 'scripts/check-android-build-environment.mjs')],
        { cwd: plan.root, env: plan.environment });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--check')) {
            throw new Error('지원하는 옵션은 --check입니다.');
        }
        process.exitCode = process.argv[2] === '--check' ? checkAndroidDebugBuild() : buildAndroidDebug();
    }
    catch (error) { console.error(error.message); process.exitCode = 1; }
}
