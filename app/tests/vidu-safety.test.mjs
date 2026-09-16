import test from 'node:test';
import assert from 'node:assert/strict';
import { isLocalPreviewRequest } from '../server/local-preview.js';
import { createViduTemporaryKey } from '../server/api/start-session.ts';

test('preview requires an explicit development flag and a direct loopback request', () => {
  const req = { socket: { remoteAddress: '127.0.0.1' }, headers: {} };
  const env = { NODE_ENV: 'development', LOCAL_PREVIEW: 'true' };
  assert.equal(isLocalPreviewRequest(req, env), true);
  for (const override of [{ NODE_ENV: 'production' }, { NODE_ENV: undefined }, { LOCAL_PREVIEW: 'false' }, { VERCEL: '1' }]) {
    assert.equal(isLocalPreviewRequest(req, { ...env, ...override }), false);
  }
  assert.equal(isLocalPreviewRequest({ ...req, socket: { remoteAddress: '192.0.2.1' } }, env), false);
  assert.equal(isLocalPreviewRequest({ ...req, headers: { 'x-forwarded-for': '192.0.2.1' } }, env), false);
  assert.equal(isLocalPreviewRequest({ body: { userId: '00000000-0000-0000-0000-000000000001' } }, env), false);
});

test('Vidu never substitutes the permanent API key for a client credential', async (t) => {
  const permanentKey = 'test-server-only-key';
  const oldMock = process.env.VIDU_MOCK;
  delete process.env.VIDU_MOCK;
  t.after(() => { if (oldMock === undefined) delete process.env.VIDU_MOCK; else process.env.VIDU_MOCK = oldMock; });
  for (const data of [{ live: { id: 'test-live' }, rtc: { token: 'rtc-only' } }, { token: permanentKey }]) {
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(data), { status: 200 }));
    const result = await createViduTemporaryKey({ apiKey: permanentKey, maxSeconds: 60, sessionId: 'test-session' });
    assert.equal(result.error.error, 'VIDU_TRANSPORT_NOT_READY');
    assert.equal(JSON.stringify(result).includes(permanentKey), false);
    t.mock.restoreAll();
  }
});
