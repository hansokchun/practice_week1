import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { auditPerformanceArtifacts } from "../mobile/scripts/audit-performance-budget.mjs";

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ikkyee-mobile-performance-"));
  const files = {
    "_expo/static/js/ios/entry-a.hbc": 100,
    "_expo/static/js/android/entry-b.hbc": 120,
    "_expo/static/js/web/entry-c.js": 80,
    "assets/photo.jpg": 40,
    "index.html": 20
  };
  for (const [relative, size] of Object.entries(files)) {
    const target = path.join(directory, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.alloc(size));
  }
  return directory;
}

const budget = {
  androidEntryBytes: 150,
  iosEntryBytes: 150,
  largestAssetBytes: 50,
  totalExportBytes: 400,
  webEntryBytes: 100
};

test("mobile performance artifact audit measures each platform and passes within budget", () => {
  const directory = fixture();
  try {
    const result = auditPerformanceArtifacts(directory, budget);
    assert.equal(result.status, "PASS");
    assert.deepEqual(result.metrics, {
      androidEntryBytes: 120,
      iosEntryBytes: 100,
      largestAssetBytes: 40,
      totalExportBytes: 360,
      webEntryBytes: 80
    });
    assert.deepEqual(result.findings, []);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});

test("mobile performance artifact audit reports only metric names for exceeded or missing output", () => {
  const directory = fixture();
  try {
    const result = auditPerformanceArtifacts(directory, { ...budget, androidEntryBytes: 119 });
    assert.equal(result.status, "FAIL");
    assert.deepEqual(result.findings, ["androidEntryBytes"]);
    fs.rmSync(path.join(directory, "_expo/static/js/ios"), { recursive: true });
    assert.deepEqual(auditPerformanceArtifacts(directory, budget).findings, ["iosEntryBytes"]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("mobile performance budget is wired to package scripts and CI production export", () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL("../mobile/package.json", import.meta.url), "utf8"));
  const workflow = fs.readFileSync(new URL("../.github/workflows/mobile-ci.yml", import.meta.url), "utf8");
  const policy = JSON.parse(fs.readFileSync(new URL("../mobile/performance-budget.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts["performance:verify"], "node ./scripts/audit-performance-budget.mjs");
  assert.match(workflow, /npm run export:all[\s\S]*npm run performance:verify/u);
  assert.equal(policy.version, 1);
  assert.equal(policy.runtime.thumbnailCacheBytes, 512 * 1024 * 1024);
  assert.equal(policy.runtime.thumbnailLongEdge, 512);
  assert.equal(policy.runtime.publicationLongEdge, 2048);
  assert.equal(policy.runtime.explorePageSize, 20);
});
