import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const mobileRoot = resolve(dirname(scriptPath), "..");

function filesBelow(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(absolute) : entry.isFile() ? [absolute] : [];
  });
}

function metricFile(files, root, pattern) {
  return files.find((file) => pattern.test(relative(root, file).replaceAll("\\", "/"))) ?? null;
}

function safeSize(file) {
  return file === null ? 0 : statSync(file).size;
}

export function auditPerformanceArtifacts(distDirectory, budget) {
  const root = resolve(distDirectory);
  const files = filesBelow(root);
  const ios = metricFile(files, root, /^_expo\/static\/js\/ios\/entry-[^/]+\.hbc$/u);
  const android = metricFile(files, root, /^_expo\/static\/js\/android\/entry-[^/]+\.hbc$/u);
  const web = metricFile(files, root, /^_expo\/static\/js\/web\/entry-[^/]+\.js$/u);
  const assetFiles = files.filter((file) => relative(root, file).replaceAll("\\", "/").startsWith("assets/"));
  const metrics = {
    androidEntryBytes: safeSize(android),
    iosEntryBytes: safeSize(ios),
    largestAssetBytes: Math.max(0, ...assetFiles.map((file) => statSync(file).size)),
    totalExportBytes: files.reduce((sum, file) => sum + statSync(file).size, 0),
    webEntryBytes: safeSize(web)
  };
  const missing = [
    ["androidEntryBytes", android],
    ["iosEntryBytes", ios],
    ["webEntryBytes", web]
  ].flatMap(([name, file]) => file === null ? [name] : []);
  const exceeded = Object.entries(metrics).flatMap(([name, value]) => {
    const maximum = budget[name];
    return typeof maximum !== "number" || maximum <= 0 || value > maximum ? [name] : [];
  });
  const findings = [...new Set([...missing, ...exceeded])].sort();
  return { status: findings.length === 0 ? "PASS" : "FAIL", metrics, findings };
}

function auditRuntimeContracts(root, runtime) {
  const findings = [];
  const checks = [
    ["thumbnailCacheBytes", "src/thumbnail-cache.ts", new RegExp(`MAXIMUM_THUMBNAIL_CACHE_BYTES = ${runtime.thumbnailCacheBytes / 1024 / 1024} \\* 1024 \\* 1024`, "u")],
    ["thumbnailLongEdge", "src/device-photo-thumbnail-cache.ts", new RegExp(`THUMBNAIL_LONG_EDGE = ${runtime.thumbnailLongEdge}\\b`, "u")],
    ["publicationLongEdge", "src/publication-derivative.ts", new RegExp(`PUBLICATION_DERIVATIVE_MAXIMUM_LONG_EDGE = ${runtime.publicationLongEdge}\\b`, "u")],
    ["thumbnailConcurrency", "src/device-photo-thumbnails.ts", new RegExp(`concurrency = ${runtime.thumbnailConcurrency}\\b`, "u")],
    ["thumbnailMaximumConcurrency", "src/device-photo-thumbnails.ts", new RegExp(`Math\\.min\\(${runtime.thumbnailMaximumConcurrency},`, "u")],
    ["publicationSelectionMaximum", "src/publication-derivative.ts", new RegExp(`assetIds\\.length <= ${runtime.publicationSelectionMaximum}\\b`, "u")],
    ["explorePageSize", "app/(tabs)/index.tsx", new RegExp(`pageSize: ${runtime.explorePageSize}\\b`, "u")],
    ["exploreMaximumPageSize", "src/explore-photo-repository.ts", new RegExp(`input\\.pageSize > ${runtime.exploreMaximumPageSize}\\b`, "u")],
    ["signedUrlRefreshMilliseconds", "src/content-visibility-refresh.ts", new RegExp(`SIGNED_URL_REFRESH_INTERVAL_MS = ${runtime.signedUrlRefreshMilliseconds.toLocaleString("en-US").replaceAll(",", "_")}\\b`, "u")]
  ];
  for (const [name, path, pattern] of checks) {
    const file = resolve(root, path);
    if (!existsSync(file) || !pattern.test(readFileSync(file, "utf8"))) findings.push(name);
  }
  const native = JSON.parse(readFileSync(resolve(root, "src/native-media-capabilities.json"), "utf8"));
  if (native.enumeration?.pageSize !== runtime.mediaPageSize) findings.push("mediaPageSize");
  if (native.enumeration?.maximumAssetsPerRun !== runtime.maximumAssetsPerRun) findings.push("maximumAssetsPerRun");
  return findings.sort();
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const policy = JSON.parse(readFileSync(resolve(mobileRoot, "performance-budget.json"), "utf8"));
  const artifactReport = auditPerformanceArtifacts(resolve(mobileRoot, "dist"), policy.artifacts);
  const runtimeFindings = auditRuntimeContracts(mobileRoot, policy.runtime);
  const findings = [...artifactReport.findings, ...runtimeFindings.map((name) => `runtime:${name}`)];
  const report = {
    status: findings.length === 0 ? "PASS" : "FAIL",
    metrics: artifactReport.metrics,
    findingCount: findings.length,
    findings
  };
  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (report.status !== "PASS") process.exitCode = 1;
}
