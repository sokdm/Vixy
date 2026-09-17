import assert from 'node:assert/strict';
import test from 'node:test';
import { createEngagementHandler } from '../server/api/customer-engagement.ts';

const userId = '11111111-1111-4111-8111-111111111111';
const reviewId = '33333333-3333-4333-8333-333333333333';
function response() {
  return { code: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; }, end() {}, send(value) { this.body = value; return this; } };
}
function database({ admin = false } = {}) {
  const calls = [];
  return {
    calls,
    auth: { getUser: async (token) => ({ data: { user: token === 'valid-test-token' ? { id: userId } : null } }) },
    rpc: async (name, args) => { calls.push({ name, args }); return { data: reviewId }; },
    from(table) {
      const query = { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: table === 'admin_users' ? admin ? { role: 'admin', is_active: true } : null : { account_status: 'active' } }) };
      return query;
    },
  };
}
test('communications APIs reject unauthenticated users and non-admin publishing', async () => {
  for (const route of ['feedback', 'announcements', 'admin-engagement', 'engagement-cron']) {
    const res = response();
    await createEngagementHandler(route, { db: database() })({ method: 'GET', headers: {}, query: {} }, res);
    assert.equal(res.code, 401, route);
  }
  const res = response();
  await createEngagementHandler('admin-engagement', { db: database() })({ method: 'POST', headers: { authorization: 'Bearer valid-test-token' }, body: { action: 'publish' } }, res);
  assert.equal(res.code, 403);
});
test('feedback binds the review to the authenticated user, not client recipient fields', async () => {
  const db = database(); const res = response();
  await createEngagementHandler('feedback', { db })({ method: 'POST', headers: { authorization: 'Bearer valid-test-token' }, body: { id: reviewId, category: 'idea', message: 'Please add more background choices.', userId: reviewId, email: 'forged@example.com' } }, res);
  assert.equal(res.code, 201);
  assert.equal(db.calls[0].args.p_user, userId);
  assert.equal(Object.hasOwn(db.calls[0].args, 'email'), false);
});
test('invalid reviews and invalid announcement dates do not reach persistence', async () => {
  const db = database({ admin: true });
  for (const [route, body] of [
    ['feedback', { id: reviewId, category: 'idea', message: 'short' }],
    ['admin-engagement', { action: 'publish', title: 'Maintenance', message: 'Returning soon.', kind: 'maintenance', endsAt: 'not-a-date' }],
  ]) {
    const res = response();
    await createEngagementHandler(route, { db })({ method: 'POST', headers: { authorization: 'Bearer valid-test-token' }, body }, res);
    assert.equal(res.code, 400);
  }
  assert.equal(db.calls.length, 0);
});

test('admin communications reads run together after authorization and preserve pagination', async () => {
  const db = database({ admin: true });
  const originalFrom = db.from;
  const pending = new Map();
  const ranges = [];
  db.from = (table) => {
    if (table === 'admin_users') return originalFrom(table);
    const query = {
      select() { return this; }, order() { return this; },
      range(from, to) { ranges.push([from, to]); return this; }, limit() { return this; },
      then(resolve) { return new Promise(done => pending.set(table, done)).then(resolve); },
    };
    return query;
  };
  const res = response();
  const request = createEngagementHandler('admin-engagement', { db })({ method: 'GET', headers: { authorization: 'Bearer valid-test-token' }, query: { offset: '50' } }, res);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pending.size, 3, 'all three reads must start before any finishes');
  assert.deepEqual(ranges, [[50, 99]]);
  pending.get('customer_reviews')({ data: [{ id: reviewId }], count: 51 });
  pending.get('customer_announcements')({ data: [] });
  pending.get('customer_email_jobs')({ data: [] });
  await request;
  assert.equal(res.code, 200);
  assert.equal(res.body.reviewCount, 51);
  assert.equal(res.body.offset, 50);
  assert.equal(res.body.reviews[0].id, reviewId);
});
