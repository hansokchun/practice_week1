import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Capacitor 8's generated project pins these versions. Build Tools 36.0.0
// must be explicit: AGP 8.13 otherwise defaults to Build Tools 35.0.0.
export const ANDROID_BUILD_REQUIREMENTS = Object.freeze({
    nodeMajor: 22,
    javaMajor: 21,
    compileSdk: 36,
    targetSdk: 36,
    minSdk: 24,
    buildTools: '36.0.0',
    gradle: '8.14.3',
    androidGradlePlugin: '8.13.0'
});

export function parseJavaVersion(text, tool = 'java') {
    if (typeof text !== 'string') return null;
    const match = tool === 'javac'
        ? text.match(/(?:^|\n)\s*javac\s+(\d+(?:\.\d+)*)/)
        : text.match(/(?:^|\n)\s*(?:openjdk|java)(?:\s+version)?\s+"?(\d+(?:\.\d+)*)/);
    if (!match) return null;
    const parts = match[1].split('.').map(Number);
    return { major: parts[0] === 1 ? parts[1] : parts[0], version: match[1] };
}

function decodeXmlText(text) {
    return text.replace(/\r\n?/g, '\n').replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, entity => {
        const named = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
        if (Object.hasOwn(named, entity)) return named[entity];
        const hex = entity.startsWith('&#x');
        return String.fromCodePoint(Number.parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10));
    });
}

/** Reads acceptance records only, matching Android's SHA-1 license-text check. */
export function inspectSdkLicenses(packageXmlFiles, readAcceptance) {
    if (!Array.isArray(packageXmlFiles) || !packageXmlFiles.length
        || packageXmlFiles.some(xml => typeof xml !== 'string' || !xml)) {
        return { status: 'unknown', checked: 0 };
    }
    const required = new Map();
    try {
        for (const xml of packageXmlFiles) {
            const references = [...xml.matchAll(/<(?:\w+:)?uses-license\b[^>]*\bref=["']([^"']+)["'][^>]*\/?\s*>/g)]
                .map(match => match[1]);
            if (!references.length) return { status: 'unknown', checked: 0 };
            for (const id of references) {
                // Never turn an untrusted XML reference into an arbitrary path.
                if (!/^[a-zA-Z0-9._-]+$/.test(id)) return { status: 'unknown', checked: 0 };
                const declarations = [...xml.matchAll(/<(?:\w+:)?license\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?license>/g)];
                const declaration = declarations.find(match => match[1].match(/\bid=["']([^"']+)["']/)?.[1] === id);
                if (!declaration) return { status: 'unknown', checked: 0 };
                const text = decodeXmlText(declaration[2]);
                if (!text.trim()) return { status: 'unknown', checked: 0 };
                const fingerprint = createHash('sha1').update(text, 'utf8').digest('hex');
                if (!required.has(id)) required.set(id, new Set());
                required.get(id).add(fingerprint);
            }
        }
        for (const [id, fingerprints] of required) {
            const accepted = new Set(String(readAcceptance(id) || '').split(/\r?\n/).map(line => line.trim()));
            if ([...fingerprints].some(fingerprint => !accepted.has(fingerprint))) {
                return { status: 'blocked', checked: required.size };
            }
        }
        return { status: 'pass', checked: required.size };
    } catch {
        return { status: 'unknown', checked: 0 };
    }
}

function readTextFromDisk(path) {
    try { return readFileSync(path, 'utf8'); } catch { return null; }
}

function runVersionCommand(command, args, env) {
    return spawnSync(command, args, { env, encoding: 'utf8', timeout: 10000,
        maxBuffer: 64 * 1024, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
}

function parseJson(text) {
    try { return JSON.parse(text) || {}; } catch { return {}; }
}

function propertyValue(text, name) {
    if (typeof text !== 'string') return '';
    return text.match(new RegExp(`^\\s*${name.replaceAll('.', '\\.')}\\s*=\\s*(.+?)\\s*$`, 'm'))?.[1] || '';
}

function decodePropertyPath(path) {
    return path.replace(/\\([\\ :])/g, '$1');
}

export function checkAndroidBuildEnvironment({
    rootDirectory = fileURLToPath(new URL('../', import.meta.url)),
    env = process.env,
    nodeVersion = process.versions.node,
    platform = process.platform,
    readText = readTextFromDisk,
    exists = existsSync,
    runCommand = runVersionCommand
} = {}) {
    const root = resolve(rootDirectory);
    const projectDirectory = join(root, 'app-shell/android');
    const read = path => {
        try { return readText(path); } catch { return null; }
    };
    const present = path => {
        try { return exists(path) === true; } catch { return false; }
    };
    const source = path => read(join(root, path));
    const probe = (command, args) => {
        try { return runCommand(command, args, env) || {}; } catch { return {}; }
    };
    const requirements = ANDROID_BUILD_REQUIREMENTS;
    const checks = [];
    const add = (id, label, status, message, version) => {
        checks.push({ id, label, status, message, ...(version ? { version } : {}) });
    };
    const sanitizedNode = String(nodeVersion).replace(/^v/, '').match(/^\d+(?:\.\d+)*/)?.[0] || '';
    const nodeReady = Number.parseInt(sanitizedNode, 10) >= requirements.nodeMajor;
    add('node', 'Node.js', nodeReady ? 'pass' : 'blocked', nodeReady
        ? 'Capacitor의 Node 버전 조건을 충족합니다.' : 'Node.js 22 이상이 필요합니다.', sanitizedNode);

    const extension = platform === 'win32' ? '.exe' : '';
    const gradleProperties = source('app-shell/android/gradle.properties');
    const gradleJavaHome = decodePropertyPath(propertyValue(gradleProperties, 'org.gradle.java.home'));
    const localJava = join(root, 'app-shell/.toolchain/java/jdk-21.0.12.1+1/Contents/Home');
    const javaHome = gradleJavaHome || env.IKKYEE_JAVA_HOME || env.JAVA_HOME
        || (present(join(localJava, `bin/java${extension}`)) ? localJava : '');
    const javaCommand = javaHome ? join(javaHome, `bin/java${extension}`) : `java${extension}`;
    const compilerCommand = javaHome ? join(javaHome, `bin/javac${extension}`) : `javac${extension}`;
    const runtimeProbe = probe(javaCommand, ['-version']);
    const compilerProbe = probe(compilerCommand, ['-version']);
    const runtime = runtimeProbe.status === 0
        ? parseJavaVersion(`${runtimeProbe.stdout || ''}\n${runtimeProbe.stderr || ''}`) : null;
    const compiler = compilerProbe.status === 0
        ? parseJavaVersion(`${compilerProbe.stdout || ''}\n${compilerProbe.stderr || ''}`, 'javac') : null;
    const javaReady = runtime?.major === requirements.javaMajor && compiler?.major === requirements.javaMajor;
    add('jdk', 'Java 개발 도구', javaReady ? 'pass' : 'blocked', javaReady
        ? 'Java 21 런타임과 컴파일러를 확인했습니다.' : '같은 JDK의 Java 21 런타임과 javac가 필요합니다.', runtime?.version);

    const localSdk = decodePropertyPath(propertyValue(source('app-shell/android/local.properties'), 'sdk.dir'));
    const sdkEnvironmentPaths = env.IKKYEE_ANDROID_SDK
        ? [env.IKKYEE_ANDROID_SDK] : [env.ANDROID_HOME, env.ANDROID_SDK_ROOT];
    const configuredSdkPaths = [localSdk, ...sdkEnvironmentPaths].filter(value => typeof value === 'string' && value);
    if (!configuredSdkPaths.length) configuredSdkPaths.push(join(root, 'app-shell/.toolchain/android-sdk'));
    const sdkRoots = new Set(configuredSdkPaths.map(path => resolve(path)));
    const sdk = sdkRoots.size === 1 ? [...sdkRoots][0] : null;
    const sdkFile = path => sdk ? join(sdk, path) : null;
    const sdkPresent = path => sdk !== null && present(sdkFile(path));
    const sdkRead = path => sdk ? read(sdkFile(path)) : null;
    const platformReady = sdkPresent('platforms/android-36/android.jar')
        && propertyValue(sdkRead('platforms/android-36/source.properties'), 'AndroidVersion.ApiLevel') === '36';
    const commandLineToolsReady = sdkPresent(`cmdline-tools/latest/bin/sdkmanager${platform === 'win32' ? '.bat' : ''}`);
    const sdkReady = platformReady && commandLineToolsReady;
    add('android-sdk', 'Android SDK', sdkReady ? 'pass' : 'blocked', sdkReady
        ? 'API 36과 Android 명령줄 도구를 확인했습니다.'
        : sdkRoots.size > 1 ? 'SDK 경로 설정이 서로 달라 하나로 맞춰야 합니다.'
            : 'SDK 경로, API 36 및 명령줄 도구가 필요합니다.');

    const buildToolsDirectory = `build-tools/${requirements.buildTools}`;
    const buildToolsReady = propertyValue(sdkRead(`${buildToolsDirectory}/source.properties`), 'Pkg.Revision') === requirements.buildTools
        && ['aapt2', 'zipalign'].every(tool => sdkPresent(`${buildToolsDirectory}/${tool}${extension}`))
        && sdkPresent(`${buildToolsDirectory}/apksigner${platform === 'win32' ? '.bat' : ''}`);
    add('build-tools', 'APK 빌드 도구', buildToolsReady ? 'pass' : 'blocked', buildToolsReady
        ? 'Build Tools 36.0.0을 확인했습니다.' : 'Build Tools 36.0.0의 aapt2, zipalign, apksigner가 필요합니다.');

    const adbProbe = sdkPresent(`platform-tools/adb${extension}`) ? probe(sdkFile(`platform-tools/adb${extension}`), ['version']) : {};
    const adbVersion = adbProbe.status === 0
        ? String(adbProbe.stdout || '').match(/Android Debug Bridge version\s+(\d+(?:\.\d+)*)/)?.[1] : null;
    add('adb', 'Android 연결 도구', adbVersion ? 'pass' : 'blocked', adbVersion
        ? 'adb 실행 버전을 확인했습니다. 연결 기기는 조회하지 않았습니다.' : '설치 후 실행 가능한 platform-tools의 adb가 필요합니다.', adbVersion);

    const licenses = inspectSdkLicenses([
        sdkRead('platforms/android-36/package.xml'),
        sdkRead(`${buildToolsDirectory}/package.xml`),
        sdkRead('platform-tools/package.xml')
    ], id => sdkRead(`licenses/${id}`));
    add('sdk-licenses', 'SDK 약관 기록', licenses.status, licenses.status === 'pass'
        ? '설치 패키지와 기존 SDK 약관 기록이 일치합니다.'
        : licenses.status === 'blocked' ? '필요한 SDK 약관 기록이 없습니다. 사용자가 약관을 확인하고 직접 동의해야 합니다.'
            : '설치 패키지의 SDK 약관 기록을 아직 확인할 수 없습니다. 자동 동의하지 않습니다.');

    const variables = source('app-shell/android/variables.gradle') || '';
    const appBuild = source('app-shell/android/app/build.gradle') || '';
    const generatedBuild = source('app-shell/android/app/capacitor.build.gradle') || '';
    const rootBuild = source('app-shell/android/build.gradle') || '';
    const wrapper = source('app-shell/android/gradle/wrapper/gradle-wrapper.properties') || '';
    const pluginSettings = source('app-shell/android/capacitor.settings.gradle') || '';
    const pluginDirectories = [...pluginSettings.matchAll(/new File\(['"]([^'"]+)['"]\)/g)].map(match => match[1]);
    const projectFiles = ['gradlew', 'gradle/wrapper/gradle-wrapper.jar', 'settings.gradle',
        'capacitor-cordova-android-plugins/build.gradle', 'capacitor-cordova-android-plugins/cordova.variables.gradle',
        'app/src/main/AndroidManifest.xml', 'app/src/main/assets/capacitor.config.json',
        'app/src/main/assets/capacitor.plugins.json'];
    const sourceHtml = source('app-shell/www/index.html');
    const copiedHtml = source('app-shell/android/app/src/main/assets/public/index.html');
    const currentAppId = appBuild.match(/applicationId\s*(?:=\s*)?['"]([^'"]+)['"]/)?.[1];
    const capacitorConfig = parseJson(source('capacitor.config.json'));
    const projectReady = projectFiles.every(path => present(join(projectDirectory, path)))
        && currentAppId === 'com.ikkyee.mobile' && capacitorConfig.appId === 'com.ikkyee.mobile'
        && /minSdkVersion\s*=\s*24\b/.test(variables)
        && /compileSdkVersion\s*=\s*36\b/.test(variables)
        && /targetSdkVersion\s*=\s*36\b/.test(variables)
        && /buildToolsVersion\s*(?:=\s*)?['"]36\.0\.0['"]/.test(appBuild)
        && /sourceCompatibility\s+JavaVersion\.VERSION_21\b/.test(generatedBuild)
        && /targetCompatibility\s+JavaVersion\.VERSION_21\b/.test(generatedBuild)
        && rootBuild.includes(`com.android.tools.build:gradle:${requirements.androidGradlePlugin}`)
        && wrapper.includes(`gradle-${requirements.gradle}-`)
        && pluginDirectories.length > 0
        && pluginDirectories.every(path => present(join(resolve(projectDirectory, path), 'build.gradle')))
        && typeof sourceHtml === 'string' && sourceHtml.length > 0 && sourceHtml === copiedHtml;
    add('project-ready', 'Android 프로젝트', projectReady ? 'pass' : 'blocked', projectReady
        ? '프로젝트 버전과 복사된 앱 시작 문서가 일치합니다. 실제 컴파일은 별도입니다.'
        : '앱 식별자, SDK·Java·Gradle 설정, Build Tools 고정과 앱 동기화 결과를 확인해야 합니다.');

    const legacy = parseJson(source('mobile/app.json'));
    const versionCode = Number(appBuild.match(/versionCode\s*(?:=\s*)?(\d+)\b/)?.[1]) || null;
    return {
        mode: 'read-only',
        ready: checks.every(check => check.status === 'pass'),
        requirements,
        checks,
        installationGate: {
            status: 'not-verified',
            versionCode,
            sharesLegacyApplicationId: Boolean(currentAppId && currentAppId === legacy.expo?.android?.package),
            message: '기존 앱의 실제 빌드 번호·서명 및 미완료 사진 작업 보존을 대조하기 전에는 업데이트 설치로 확인하지 않습니다.'
        }
    };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const report = checkAndroidBuildEnvironment();
        console.log(JSON.stringify(report, null, 2));
        if (!report.ready) process.exitCode = 1;
    } catch {
        console.error('Android 빌드 준비 상태를 확인하지 못했습니다. 환경 설정을 검토해주세요.');
        process.exitCode = 1;
    }
}
