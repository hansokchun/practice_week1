import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(scriptDir, '..');
const repoRoot = resolve(mobileRoot, '..');
const defaultContractPath = resolve(mobileRoot, 'src/backend-policy-contract.json');
const expectedMobileTables = ['profiles', 'photos', 'photo_private_locations', 'comments', 'user_likes'];
const expectedWebTables = ['albums', 'album_photos'];
const operations = ['select', 'insert', 'update', 'delete'];
const roles = ['owner', 'nonOwner', 'anonymous'];
const advisorFollowups = [
  { id: 'authenticated-security-definer-set_photo_like', severity: 'warning' },
  { id: 'leaked-password-protection-disabled', severity: 'warning' },
];
const forbiddenWriteSql = /\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE|GRANT|REVOKE|SET)\b/i;
const sensitivePattern = /(?:sb_secret_|\bservice[_-]?role\b|eyJ[a-zA-Z0-9_-]{20,}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b|https?:\/\/[^\s"']+:[^\s"']+@)/i;

function fail() {
  process.stdout.write(`${JSON.stringify({ status: 'FAIL', error: 'contract validation failed' })}\n`);
  process.exitCode = 1;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sameArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function resolveInputPath(value, fallback) {
  if (!value) return fallback;
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
}

function matrixIsComplete(contract) {
  return expectedMobileTables.every((table) => operations.every((operation) => {
    const decisions = contract.tables?.[table]?.roleMatrix?.[operation];
    return roles.every((role) => (
      typeof decisions?.[role]?.allowed === 'boolean'
      && typeof decisions?.[role]?.scope === 'string'
      && decisions[role].scope.length > 3
    ));
  }));
}

function summarizeRoleMatrix(contract) {
  const tables = {};
  let totalDecisions = 0;
  let allowCount = 0;
  let denyCount = 0;

  for (const table of expectedMobileTables) {
    tables[table] = {};
    for (const operation of operations) {
      const operationSummary = {
        totalDecisions: 0,
        allowCount: 0,
        denyCount: 0,
      };
      for (const role of roles) {
        const allowed = contract.tables[table].roleMatrix[operation][role].allowed;
        const decision = {
          allowCount: allowed ? 1 : 0,
          denyCount: allowed ? 0 : 1,
        };
        operationSummary[role] = decision;
        operationSummary.totalDecisions += 1;
        operationSummary.allowCount += decision.allowCount;
        operationSummary.denyCount += decision.denyCount;
        totalDecisions += 1;
        allowCount += decision.allowCount;
        denyCount += decision.denyCount;
      }
      tables[table][operation] = operationSummary;
    }
  }

  return { totalDecisions, allowCount, denyCount, tables };
}

function hasExpectedAdvisorEvidence(contract, catalog) {
  const evidence = [...(contract.observedRisks ?? []), ...(catalog.advisorWarnings ?? [])].join(' ');
  return /authenticated[\s\S]*set_photo_like[\s\S]*definer/i.test(evidence)
    && /leaked-password protection is disabled/i.test(evidence);
}

function validate(contract, catalogBytes, catalog) {
  const serialized = JSON.stringify(contract);
  const catalogSerialized = JSON.stringify(catalog);
  const inspectedAt = Date.parse(contract.inspectedAt);
  const now = Date.now();
  const repositories = contract.mobileRepositories ?? [];
  const catalogHash = createHash('sha256').update(catalogBytes).digest('hex');
  const mobilePolicies = expectedMobileTables.flatMap((table) => contract.tables?.[table]?.policies ?? []);
  const catalogPolicyNames = new Set((catalog.policies ?? []).map(({ name }) => name));

  return contract.projectRef === 'pqczcponriukilrtpbdl'
    && contract.liveMetadataReadOnly === true
    && sameArray(contract.mobileAllowedTables, expectedMobileTables)
    && sameArray(contract.webOnlyTables, expectedWebTables)
    && repositories.length === expectedMobileTables.length
    && sameArray(repositories.map(({ table }) => table), expectedMobileTables)
    && repositories.every(({ table, name, queries, mutations }) => (
      !/album/i.test(`${table} ${name} ${(queries ?? []).join(' ')} ${(mutations ?? []).join(' ')}`)
    ))
    && matrixIsComplete(contract)
    && hasExpectedAdvisorEvidence(contract, catalog)
    && contract.roleProbe?.mode === 'catalog-plus-fixture'
    && contract.roleProbe?.liveImpersonation === false
    && /SELECT-only/i.test(contract.roleProbe?.limitation ?? '')
    && contract.functions?.every(({ securityMode }) => securityMode === 'definer')
    && contract.functions?.some(({ name, mobileRequired, authenticatedExecute }) => (
      name === 'set_photo_like' && mobileRequired === true && authenticatedExecute === true
    ))
    && contract.storageBoundary?.bucket === 'photos'
    && contract.storageBoundary?.public === false
    && contract.storageBoundary?.ownerPathPrefix === '<auth.uid()>/<object-name>'
    && contract.storageBoundary?.signedReadsRequired === true
    && sameArray(contract.storageBoundary?.upsertRequires, ['SELECT', 'INSERT', 'UPDATE'])
    && sameArray(contract.oauth?.providers, ['google', 'kakao'])
    && contract.oauth?.nativeRedirect === 'ikkyee://auth/callback'
    && /^unknown:/.test(contract.oauth?.liveProviderEnablement ?? '')
    && contract.policyDrift?.status === 'matched'
    && Number.isFinite(inspectedAt)
    && inspectedAt <= now + 5 * 60 * 1000
    && inspectedAt >= now - 30 * 24 * 60 * 60 * 1000
    && contract.liveEvidence?.catalogSha256 === catalogHash
    && catalog.projectRef === contract.projectRef
    && catalog.inspectedAt === contract.inspectedAt
    && catalog.fingerprint?.migrationCount === 12
    && catalog.fingerprint?.publicFunctionCount === 5
    && catalog.fingerprint?.bucketCount === 1
    && catalog.fingerprint?.policyCount === 28
    && catalog.storage?.bucket === contract.storageBoundary.bucket
    && catalog.storage?.public === false
    && expectedMobileTables.every((table) => sameArray(catalog.tables?.[table], contract.tables?.[table]?.columns))
    && mobilePolicies.every(({ name }) => catalogPolicyNames.has(name))
    && contract.liveEvidence?.queryShapes?.length > 0
    && contract.liveEvidence.queryShapes.every((query) => /^SELECT\b/i.test(query.trim()) && !forbiddenWriteSql.test(query))
    && !sensitivePattern.test(serialized)
    && !sensitivePattern.test(catalogSerialized);
}

if (process.argv.length !== 2 || process.argv.includes('--show-sensitive')) {
  fail();
} else {
  try {
    const contractPath = resolveInputPath(process.env.BACKEND_POLICY_CONTRACT_PATH, defaultContractPath);
    const contract = readJson(contractPath);
    const catalogPath = resolveInputPath(
      process.env.BACKEND_POLICY_EVIDENCE_PATH,
      resolve(repoRoot, contract.liveEvidence.catalogPath),
    );
    const catalogBytes = readFileSync(catalogPath);
    const catalog = JSON.parse(catalogBytes.toString('utf8'));

    if (!validate(contract, catalogBytes, catalog)) {
      fail();
    } else {
      const roleMatrix = summarizeRoleMatrix(contract);
      process.stdout.write(`${JSON.stringify({
        status: 'PASS',
        projectRef: contract.projectRef,
        inspectedAt: contract.inspectedAt,
        liveMetadataReadOnly: true,
        mobileAllowedTables: contract.mobileAllowedTables,
        webOnlyTables: contract.webOnlyTables,
        mobileAlbumRepositories: 0,
        ownerNonOwnerAnonymousMatrixComplete: true,
        advisorFollowups: {
          count: advisorFollowups.length,
          items: advisorFollowups,
        },
        roleProbe: {
          mode: contract.roleProbe.mode,
          liveImpersonation: contract.roleProbe.liveImpersonation,
          reasonCode: 'select-only-catalog-inspection',
          limitation: 'Runtime role impersonation was not performed because inspection was SELECT-only.',
        },
        roleMatrix,
        storageBoundary: {
          bucket: contract.storageBoundary.bucket,
          public: contract.storageBoundary.public,
          ownerPathPrefix: contract.storageBoundary.ownerPathPrefix,
          signedReadsRequired: contract.storageBoundary.signedReadsRequired,
        },
        oauthProviders: contract.oauth.providers,
        policyDrift: contract.policyDrift.status,
        secretsPresent: false,
      })}\n`);
    }
  } catch {
    fail();
  }
}
