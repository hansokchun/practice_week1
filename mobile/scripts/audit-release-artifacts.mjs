import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptPath), '../..');
const approvedMedia = new Set([
  'mobile/assets/app-icon-foreground.png',
  'mobile/assets/app-icon.png',
  'mobile/assets/default-profile-avatar.png',
  'mobile/assets/favicon.png',
  'mobile/assets/landing-map-pins-background.jpg',
  'mobile/assets/landing-map-pins-faded.jpg',
]);
const mediaExtensions = new Set(['.gif', '.heic', '.jpeg', '.jpg', '.png', '.webp']);
const textExtensions = new Set([
  '', '.cjs', '.example', '.gitignore', '.gradle', '.js', '.json', '.jsx', '.md', '.mjs',
  '.properties', '.sql', '.swift', '.toml', '.ts', '.tsx', '.xml', '.yaml', '.yml',
]);
const forbiddenArtifactPattern = /(?:^|\/)(?:\.env(?:\..+)?|[^/]+\.(?:jks|keystore|log|mobileprovision|p12|pem))$/iu;
const sourcePathPattern = /^mobile\/(?:app|modules|src)\//u;
const personalDataPathPattern = /^(?:mobile\/(?:app|modules|src)\/|mobile\/(?:app\.json|eas\.json|\.env\.example)$|\.github\/)/u;

const sensitivePatterns = [
  { code: 'supabase-secret-key', pattern: /sb_secret_[A-Za-z0-9_-]{10,}/u },
  { code: 'google-api-key', pattern: /AIza[0-9A-Za-z_-]{30,}/u },
  { code: 'github-token', pattern: /gh[pousr]_[0-9A-Za-z]{20,}/u },
  { code: 'aws-access-key', pattern: /AKIA[0-9A-Z]{16}/u },
  { code: 'expo-access-token', pattern: /expo_[0-9A-Za-z_-]{30,}/u },
  { code: 'jwt-token', pattern: /eyJ[0-9A-Za-z_-]{20,}\.[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}/u },
  { code: 'credentialed-database-url', pattern: /postgres(?:ql)?:\/\/[^\s:/]+:[^\s@/]+@/iu },
  {
    code: 'private-key',
    pattern: new RegExp(`-----BEGIN ${'(?:RSA |EC |OPENSSH )?'}PRIVATE KEY-----`, 'u'),
  },
];

function finding(code, path) {
  return { code, path, detail: 'redacted match detected' };
}

export function auditPath(path) {
  const normalized = path.replaceAll('\\', '/');
  if (normalized === 'mobile/.env.example') return [];
  if (forbiddenArtifactPattern.test(normalized)) {
    return [{ code: 'forbidden-artifact', path: normalized }];
  }
  if (mediaExtensions.has(extname(normalized).toLowerCase()) && !approvedMedia.has(normalized)) {
    return [{ code: 'unapproved-media', path: normalized }];
  }
  return [];
}

export function auditText(path, contents) {
  const findings = [];
  for (const { code, pattern } of sensitivePatterns) {
    if (pattern.test(contents)) findings.push(finding(code, path));
  }

  if (personalDataPathPattern.test(path)) {
    const emails = contents.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gu) ?? [];
    if (emails.some((email) => !/@(?:example\.com|example\.invalid)$/iu.test(email))) {
      findings.push(finding('personal-email', path));
    }
  }

  if (sourcePathPattern.test(path)) {
    const preciseCoordinate = /\b(?:lat|latitude)\s*[:=]\s*-?\d{1,3}\.\d{4,}[\s\S]{0,120}\b(?:lng|longitude)\s*[:=]\s*-?\d{1,3}\.\d{4,}/iu;
    if (preciseCoordinate.test(contents)) findings.push(finding('precise-coordinate', path));

    const sensitiveLog = /console\.(?:debug|info|log|warn)\([^\n]*(?:access.?token|password|session|storage_path|latitude|longitude|coordinates?)/iu;
    if (sensitiveLog.test(contents)) findings.push(finding('sensitive-log', path));
  }
  return findings;
}

function listReleaseFiles() {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'mobile', '.github', 'supabase'],
    { cwd: repoRoot },
  );
  return output.toString('utf8').split('\0').filter(Boolean).sort();
}

export function auditReleaseArtifacts() {
  const paths = listReleaseFiles();
  const findings = [];
  let scannedFileCount = 0;
  let scannedTextFileCount = 0;

  for (const path of paths) {
    const absolutePath = resolve(repoRoot, path);
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) continue;
    scannedFileCount += 1;
    findings.push(...auditPath(path));

    const extension = extname(path).toLowerCase();
    if (!textExtensions.has(extension) || statSync(absolutePath).size > 2_000_000) continue;
    scannedTextFileCount += 1;
    findings.push(...auditText(path, readFileSync(absolutePath, 'utf8')));
  }

  return {
    status: findings.length === 0 ? 'PASS' : 'FAIL',
    scannedFileCount,
    scannedTextFileCount,
    findingCount: findings.length,
    findings,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const report = auditReleaseArtifacts();
  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (report.status !== 'PASS') process.exitCode = 1;
}
