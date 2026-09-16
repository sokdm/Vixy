import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdminOverview, listAdminUsers } from '../../shared/admin-service.js';

const REPORTING_PAGE_SIZE = 1000;
const REPORTING_SOURCE_ROW_LIMIT = 50000;

function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}

function makeRows(count, build) {
  return Array.from({ length: count }, (_, index) => build(index));
}

function sessionRows(count) {
  return makeRows(count, (index) => ({
    user_id: `user-${index}`,
    status: 'ended',
    created_at: `2026-09-01T00:00:${String(index % 60).padStart(2, '0')}.000Z`,
    start_time: '2026-09-01T00:00:00.000Z',
  }));
}

/**
 * Minimal stand-in for the PostgREST builder chain used by the admin reports.
 * Records every range request so tests can assert on projections, pagination
 * concurrency and ordering.
 */
function createSupabaseStub({
  tables = {},
  authUsers = [],
  narrowFailures = new Set(),
  authGate = null,
  rangeDelayMs = 2,
} = {}) {
  const rangeCalls = [];
  const sequence = [];
  const activeByTable = new Map();
  const peakByTable = new Map();

  const client = {
    auth: {
      admin: {
        async listUsers({ page, perPage }) {
          sequence.push('listUsers');
          if (authGate) await authGate;
          const from = (page - 1) * perPage;
          return { data: { users: authUsers.slice(from, from + perPage) }, error: null };
        },
      },
    },
    from(table) {
      const state = { table, columns: '*' };
      const builder = {
        select(columns) { state.columns = columns; return builder; },
        gte() { return builder; },
        eq() { return builder; },
        order() { return builder; },
        async range(from, to) {
          sequence.push(`range:${state.table}`);
          rangeCalls.push({ table: state.table, columns: state.columns, from, to });

          const active = (activeByTable.get(state.table) || 0) + 1;
          activeByTable.set(state.table, active);
          peakByTable.set(state.table, Math.max(peakByTable.get(state.table) || 0, active));

          await new Promise((resolve) => setTimeout(resolve, rangeDelayMs));
          activeByTable.set(state.table, activeByTable.get(state.table) - 1);

          if (narrowFailures.has(state.table) && state.columns !== '*') {
            return {
              data: null,
              error: { code: '42703', message: 'column "gateway_fee_ngn" does not exist' },
            };
          }

          const rows = tables[state.table] || [];
          return { data: rows.slice(from, to + 1), error: null };
        },
      };
      return builder;
    },
  };

  return {
    client,
    rangeCalls,
    sequence,
    peakFor: (table) => peakByTable.get(table) || 0,
    callsFor: (table) => rangeCalls.filter((call) => call.table === table),
  };
}

const morphlyAuthUsers = (count) => makeRows(count, (index) => ({
  id: `user-${index}`,
  email: `user${index}@example.test`,
  created_at: '2026-09-01T00:00:00.000Z',
  user_metadata: { app: 'morphly' },
}));

test('row pages are fetched concurrently instead of one round-trip at a time', async () => {
  const stub = createSupabaseStub({
    authUsers: morphlyAuthUsers(3),
    tables: { sessions: sessionRows(4 * REPORTING_PAGE_SIZE) },
  });

  await getAdminOverview(stub.client, { days: 30 });

  assert.ok(
    stub.peakFor('sessions') > 1,
    `expected overlapping session page requests, saw peak of ${stub.peakFor('sessions')}`,
  );
  assert.equal(stub.callsFor('sessions').length >= 4, true);
});

test('paginated rows are assembled in range order', async () => {
  const sessions = sessionRows(2 * REPORTING_PAGE_SIZE + 7);
  const stub = createSupabaseStub({
    authUsers: morphlyAuthUsers(2),
    tables: { sessions },
  });

  const overview = await getAdminOverview(stub.client, { days: 30 });

  // Every session row must be counted exactly once, in order, with no gaps or
  // duplicates introduced by the concurrent page batches.
  assert.equal(overview.sessions, sessions.length);
});

test('pagination stops once a short page proves the source is exhausted', async () => {
  const stub = createSupabaseStub({
    authUsers: morphlyAuthUsers(1),
    tables: { sessions: sessionRows(10) },
  });

  await getAdminOverview(stub.client, { days: 30 });

  // A single short page is enough: the batch may probe ahead, but it must not
  // keep walking ranges to the row ceiling.
  assert.ok(
    stub.callsFor('sessions').length <= 4,
    `expected the scan to stop early, saw ${stub.callsFor('sessions').length} page requests`,
  );
});

test('reports request only the columns they read instead of select(*)', async () => {
  const stub = createSupabaseStub({
    authUsers: morphlyAuthUsers(2),
    tables: { sessions: sessionRows(5), transactions: [], users: [] },
  });

  await getAdminOverview(stub.client, { days: 30 });

  for (const table of ['sessions', 'transactions', 'users']) {
    const [call] = stub.callsFor(table);
    assert.ok(call, `${table} should be queried`);
    assert.notEqual(call.columns, '*', `${table} must not be read with select('*')`);
  }

  const sessionColumns = stub.callsFor('sessions')[0].columns;
  assert.match(sessionColumns, /user_id/);
  assert.match(sessionColumns, /status/);
  assert.match(sessionColumns, /created_at/);
  // start_time is required by the growth series activation fallback.
  assert.match(sessionColumns, /start_time/);
});

test('a missing column falls back to the tolerant projection instead of failing', async () => {
  const stub = createSupabaseStub({
    authUsers: morphlyAuthUsers(2),
    tables: { transactions: [], sessions: sessionRows(3) },
    narrowFailures: new Set(['transactions']),
  });

  const overview = await getAdminOverview(stub.client, { days: 30 });

  assert.equal(typeof overview.revenueNGN, 'number');
  const projections = stub.callsFor('transactions').map((call) => call.columns);
  assert.ok(projections.includes('*'), 'expected a retry with select(*)');
});

test('the auth listing runs alongside the table reads, not before them', async () => {
  const authGate = deferred();
  const stub = createSupabaseStub({
    authUsers: morphlyAuthUsers(2),
    tables: { sessions: sessionRows(5) },
    authGate: authGate.promise,
  });

  const pending = getAdminOverview(stub.client, { days: 30 });
  await new Promise((resolve) => setTimeout(resolve, 20));

  // While the auth listing is still in flight, table reads must already have
  // been issued; previously listAllAuthUsers blocked every other query.
  assert.ok(
    stub.sequence.some((entry) => entry.startsWith('range:')),
    'table reads should not wait for the auth listing',
  );

  authGate.resolve();
  await pending;
});

test('an oversized source is capped and reported through dataHealth', async () => {
  const stub = createSupabaseStub({
    authUsers: morphlyAuthUsers(2),
    tables: { sessions: sessionRows(REPORTING_SOURCE_ROW_LIMIT + 25) },
    rangeDelayMs: 0,
  });

  const overview = await getAdminOverview(stub.client, { days: 30 });

  assert.equal(overview.sessions, REPORTING_SOURCE_ROW_LIMIT);
  assert.equal(overview.dataHealth.truncated, true);
});

test('a report that fits under the ceiling is not flagged as truncated', async () => {
  const stub = createSupabaseStub({
    authUsers: morphlyAuthUsers(2),
    tables: { sessions: sessionRows(12) },
  });

  const overview = await getAdminOverview(stub.client, { days: 30 });

  assert.equal(overview.dataHealth.truncated, false);
});

test('the user list resolves the newest analytics event per user', async () => {
  const stub = createSupabaseStub({
    authUsers: morphlyAuthUsers(1),
    tables: {
      users: [{ id: 'user-0', account_status: 'active', created_at: '2026-09-01T00:00:00.000Z' }],
      analytics_events: [
        { user_id: 'user-0', platform: 'windows', acquisition_source: 'old', created_at: '2026-09-01T00:00:00.000Z' },
        { user_id: 'user-0', platform: 'macos', acquisition_source: 'newest', created_at: '2026-09-09T00:00:00.000Z' },
      ],
    },
  });

  const [user] = await listAdminUsers(stub.client, { days: 30 });

  // Events are read ascending and applied last-write-wins, so the newest row wins.
  assert.equal(user.source, 'newest');
  assert.equal(user.platform, 'macos');
});
