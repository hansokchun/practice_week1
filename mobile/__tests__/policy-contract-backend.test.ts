type Role = 'owner' | 'nonOwner' | 'anonymous';
type Operation = 'select' | 'insert' | 'update' | 'delete';

type Decision = {
  allowed: boolean;
  scope: string;
};

type TableContract = {
  columns: string[];
  operations: Operation[];
  policies: Array<{ name: string; operation: Uppercase<Operation>; roles: string[] }>;
  roleMatrix: Record<Operation, Record<Role, Decision>>;
};

type BackendContract = {
  projectRef: string;
  inspectedAt: string;
  liveMetadataReadOnly: boolean;
  mobileAllowedTables: string[];
  webOnlyTables: string[];
  mobileReadOnlyTables: string[];
  mobileReadOnlyRepositories: Array<{ name: string; table: string; queries: string[]; mutations: string[] }>;
  mobileRepositories: Array<{ name: string; table: string }>;
  tables: Record<string, TableContract>;
  functions: Array<{
    name: string;
    arguments: string[];
    securityMode: 'definer' | 'invoker';
    mobileRequired: boolean;
    authenticatedExecute: boolean;
  }>;
  storageBoundary: {
    bucket: string;
    public: boolean;
    ownerPathPrefix: string;
    signedReadsRequired: boolean;
    upsertRequires: string[];
    policies: Array<{ name: string; operation: Uppercase<Operation> }>;
  };
  oauth: {
    providers: string[];
    nativeRedirect: string;
    localRedirects: string[];
    liveProviderEnablement: string;
  };
  policyDrift: { status: string };
  roleProbe: { mode: string; liveImpersonation: boolean; limitation: string };
  liveEvidence: {
    catalogPath: string;
    catalogSha256: string;
    queryShapes: string[];
  };
};

type DecisionCount = { allowCount: number; denyCount: number };

type BackendReport = {
  advisorFollowups: {
    count: number;
    items: Array<{ id: string; severity: string }>;
  };
  roleProbe: {
    mode: string;
    liveImpersonation: boolean;
    reasonCode: string;
    limitation: string;
  };
  roleMatrix: {
    totalDecisions: number;
    allowCount: number;
    denyCount: number;
    tables: Record<string, Record<string, Record<Role, DecisionCount> & {
      totalDecisions: number;
      allowCount: number;
      denyCount: number;
    }>>;
  };
};

const operations: Operation[] = ['select', 'insert', 'update', 'delete'];
const roles: Role[] = ['owner', 'nonOwner', 'anonymous'];

function fixtureDecision(table: string, operation: Operation, role: Role): boolean {
  const authenticated = role !== 'anonymous';
  const ownsTarget = role === 'owner';
  const visibleTarget = role !== 'owner';

  switch (table) {
    case 'profiles':
      return operation === 'select' || (authenticated && ownsTarget && ['insert', 'update'].includes(operation));
    case 'photos':
      return operation === 'select'
        ? ownsTarget || visibleTarget
        : authenticated && ownsTarget;
    case 'photo_private_locations':
      return authenticated && ownsTarget;
    case 'comments':
      if (operation === 'select') return ownsTarget || visibleTarget;
      if (operation === 'insert') return authenticated && (ownsTarget || visibleTarget);
      return false;
    case 'user_likes':
      return authenticated && ownsTarget && operation !== 'update';
    default:
      throw new Error(`Unexpected fixture table: ${table}`);
  }
}

if (process.env['JEST_WORKER_ID'] !== undefined) {
  type Hash = {
    update(data: Uint8Array): Hash;
    digest(encoding: 'hex'): string;
  };

  const { createHash } = jest.requireActual<{
    createHash(algorithm: 'sha256'): Hash;
  }>('node:crypto');
  const { readFileSync } = jest.requireActual<{
    readFileSync(path: string): Uint8Array;
  }>('node:fs');
  const { execFileSync } = jest.requireActual<{
    execFileSync(
      executable: string,
      args: string[],
      options: { cwd: string; encoding: 'utf8' },
    ): string;
  }>('node:child_process');
  const contract = jest.requireActual<BackendContract>('../src/backend-policy-contract.json');

test('pins the exact mobile and web-only backend boundaries', () => {
  expect(contract.mobileAllowedTables).toEqual([
    'profiles',
    'photos',
    'photo_private_locations',
    'comments',
    'user_likes',
  ]);
  expect(contract.webOnlyTables).toEqual([]);
  expect(contract.mobileReadOnlyTables).toEqual(['albums', 'album_photos']);
  expect(contract.mobileReadOnlyRepositories).toEqual([
    { name: 'albumRepository', table: 'albums', queries: ['select'], mutations: [] },
    { name: 'albumPhotoRepository', table: 'album_photos', queries: ['select'], mutations: [] },
  ]);
  expect(contract.mobileRepositories.map(({ table }) => table)).toEqual(contract.mobileAllowedTables);
  expect(contract.mobileRepositories.filter(({ table, name }) => /album/i.test(`${table} ${name}`))).toHaveLength(0);
});

test('defines exact columns, operations, policies, and a complete executable role matrix', () => {
  expect(contract.tables['profiles']?.columns).toEqual(['id', 'nickname', 'bio', 'avatar_url']);
  expect(contract.tables['photos']?.columns).toEqual([
    'id', 'url', 'date', 'title', 'description', 'lat', 'lng', 'liked', 'shared', 'owner_id',
    'created_at', 'album', 'album_id', 'visibility', 'geo_source', 'storage_path', 'location_precision',
  ]);
  expect(contract.tables['photo_private_locations']?.columns).toEqual([
    'photo_id', 'owner_id', 'lat', 'lng', 'created_at', 'updated_at',
  ]);
  expect(contract.tables['comments']?.columns).toEqual(['id', 'photo_id', 'text', 'date', 'author_id']);
  expect(contract.tables['user_likes']?.columns).toEqual(['user_id', 'photo_id', 'created_at']);

  for (const table of contract.mobileAllowedTables) {
    const tableContract = contract.tables[table];
    expect(tableContract?.operations).toEqual(operations);
    for (const operation of operations) {
      expect(Object.keys(tableContract?.roleMatrix[operation] ?? {}).sort()).toEqual([...roles].sort());
      for (const role of roles) {
        expect(tableContract?.roleMatrix[operation][role].allowed).toBe(fixtureDecision(table, operation, role));
        expect(tableContract?.roleMatrix[operation][role].scope.length).toBeGreaterThan(3);
      }
    }
  }

  expect(contract.tables['comments']?.policies.map(({ name }) => name)).toEqual([
    'comments_insert_visible_photo',
    'comments_select_visible_photo',
  ]);
  expect(contract.tables['user_likes']?.policies.map(({ name }) => name)).toEqual([
    'user_likes_delete_own',
    'user_likes_insert_own',
    'user_likes_select_own',
  ]);
});

test('pins function security, Storage, OAuth, and read-only evidence boundaries', () => {
  expect(contract.functions.find(({ name }) => name === 'set_photo_like')).toEqual({
    name: 'set_photo_like',
    arguments: ['target_photo_id text', 'should_like boolean'],
    securityMode: 'definer',
    mobileRequired: true,
    authenticatedExecute: true,
  });
  expect(contract.functions.every(({ securityMode }) => securityMode === 'definer')).toBe(true);
  expect(contract.storageBoundary).toMatchObject({
    bucket: 'photos',
    public: false,
    ownerPathPrefix: '<auth.uid()>/<object-name>',
    signedReadsRequired: true,
    upsertRequires: ['SELECT', 'INSERT', 'UPDATE'],
  });
  expect(contract.storageBoundary.policies.map(({ name }) => name)).toEqual([
    'photos_bucket_delete_own_object',
    'photos_bucket_insert_own_folder',
    'photos_bucket_select_owned_or_public_photo',
    'photos_bucket_update_own_object',
  ]);
  expect(contract.oauth.providers).toEqual(['google', 'kakao']);
  expect(contract.oauth.nativeRedirect).toBe('ikkyee://auth/callback');
  expect(contract.oauth.liveProviderEnablement).toMatch(/^unknown:/);
  expect(contract.liveMetadataReadOnly).toBe(true);
  expect(contract.roleProbe.liveImpersonation).toBe(false);
  expect(contract.roleProbe.mode).toBe('catalog-plus-fixture');
  expect(contract.roleProbe.limitation).toMatch(/SELECT-only/i);
  expect(contract.liveEvidence.queryShapes.length).toBeGreaterThan(0);
  expect(contract.liveEvidence.queryShapes.every((query) => /^SELECT\b/i.test(query.trim()))).toBe(true);
  expect(contract.liveEvidence.queryShapes.join(' ')).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE|GRANT|REVOKE|SET)\b/i);
});

test('contains fresh, hash-bound, sanitized source evidence', () => {
  const inspectedAt = Date.parse(contract.inspectedAt);
  expect(Number.isFinite(inspectedAt)).toBe(true);
  expect(inspectedAt).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000);
  expect(inspectedAt).toBeGreaterThan(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const repoRoot = process['cwd']().replace(/[\\/]mobile$/, '');
  const catalogBytes = readFileSync(`${repoRoot}/${contract.liveEvidence.catalogPath}`);
  expect(createHash('sha256').update(catalogBytes).digest('hex')).toBe(contract.liveEvidence.catalogSha256);

  const serialized = JSON.stringify(contract);
  expect(serialized).not.toMatch(/\bservice[_-]?role\b/i);
  expect(serialized).not.toMatch(/(?:sb_secret_|eyJ[a-zA-Z0-9_-]{20,}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/);
  expect(serialized).not.toMatch(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i);
  expect(serialized).not.toMatch(/https?:\/\/[^\s"']+:[^\s"']+@/);
});

test('report exposes sanitized advisor, role-probe, and complete role-matrix evidence', () => {
  const mobileRoot = process['cwd']().replace(/[\\/]mobile$/, '/mobile');
  const stdout = execFileSync(
    process['execPath'],
    ['scripts/report-backend-policy-contract.mjs'],
    { cwd: mobileRoot, encoding: 'utf8' },
  );
  const report = JSON.parse(stdout) as BackendReport;

  expect(report.advisorFollowups).toEqual({
    count: 2,
    items: [
      { id: 'authenticated-security-definer-set_photo_like', severity: 'warning' },
      { id: 'leaked-password-protection-disabled', severity: 'warning' },
    ],
  });
  expect(report.roleProbe).toEqual({
    mode: 'catalog-plus-fixture',
    liveImpersonation: false,
    reasonCode: 'select-only-catalog-inspection',
    limitation: 'Runtime role impersonation was not performed because inspection was SELECT-only.',
  });

  let totalDecisions = 0;
  let allowCount = 0;
  let denyCount = 0;
  for (const table of contract.mobileAllowedTables) {
    for (const operation of operations) {
      const operationReport = report.roleMatrix.tables[table]?.[operation];
      expect(operationReport).toBeDefined();
      if (!operationReport) {
        throw new Error(`Missing role aggregate for ${table}.${operation}`);
      }
      expect(operationReport.totalDecisions).toBe(3);
      for (const role of roles) {
        const expectedAllowed = contract.tables[table]?.roleMatrix[operation][role].allowed;
        expect(operationReport[role]).toEqual({
          allowCount: expectedAllowed ? 1 : 0,
          denyCount: expectedAllowed ? 0 : 1,
        });
        totalDecisions += 1;
        allowCount += expectedAllowed ? 1 : 0;
        denyCount += expectedAllowed ? 0 : 1;
      }
      expect(operationReport.allowCount + operationReport.denyCount).toBe(3);
    }
  }
  expect(report.roleMatrix).toMatchObject({ totalDecisions, allowCount, denyCount });
  expect(totalDecisions).toBe(60);
  expect(allowCount + denyCount).toBe(totalDecisions);
});
}
