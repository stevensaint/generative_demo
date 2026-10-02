import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../apps/server/src/app.js';
import { SessionStore } from '../packages/engine/src/sessions.js';
import { ApiErrorSchema, CreatedSessionSchema, HealthSchema, ProductPresentationSchema, SessionViewSchema } from '../packages/contracts/src/index.js';
import { memoryFetch } from './transport.js';

async function fixture(t: test.TestContext, options: Parameters<typeof createApp>[0] = {}) {
  const app = createApp(options);
  if (process.env.GDE_TEST_TRANSPORT !== 'tcp') {
    return { ...app, url: 'http://in-process.invalid', fetch: memoryFetch(app.server) };
  }
  await new Promise<void>((resolve, reject) => {
    app.server.once('error', reject);
    app.server.listen(0, '127.0.0.1', resolve);
  });
  const address = app.server.address();
  assert.ok(address && typeof address !== 'string');
  t.after(() => new Promise<void>((resolve, reject) => app.server.close(e => e ? reject(e) : resolve())));
  return { ...app, url: `http://127.0.0.1:${address.port}`, fetch: globalThis.fetch };
}
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

test('backend health and fictional presentation respond with valid contracts', async t => {
  const { url, fetch } = await fixture(t);
  const health = await fetch(url + '/api/health');
  assert.equal(health.status, 200); HealthSchema.parse(await health.json());
  const pack = ProductPresentationSchema.parse(await (await fetch(url + '/api/product-pack')).json());
  assert.equal(pack.name, 'Acme Quality Cloud'); assert.equal(pack.fictional, true);
});

test('concurrent sessions require distinct tokens and isolate read/end/error events', async t => {
  const { url, fetch } = await fixture(t);
  const [a, b] = await Promise.all([1, 2].map(async () => {
    const response = await fetch(url + '/api/sessions', { method: 'POST' });
    assert.equal(response.status, 201); return CreatedSessionSchema.parse(await response.json());
  }));
  assert.ok(a && b);
  assert.notEqual(a.accessToken, b.accessToken);
  assert.notEqual(a.session.sessionId, b.session.sessionId);
  const pathA = url + '/api/sessions/' + a.session.sessionId;
  const pathB = url + '/api/sessions/' + b.session.sessionId;
  for (const suffix of ['', '/end']) {
    const denied: Response = await fetch(pathB + suffix, { method: suffix ? 'POST' : 'GET', headers: auth(a.accessToken) });
    assert.equal(denied.status, 403);
    assert.equal(ApiErrorSchema.parse(await denied.json()).error.code, 'UNAUTHORIZED');
  }
  assert.equal((await fetch(pathA)).status, 403);
  const invalid = await fetch(pathA + '/end', { method: 'POST', headers: auth(a.accessToken), body: '{"secret":"do not record"}' });
  assert.equal(invalid.status, 400);
  const failure = ApiErrorSchema.parse(await invalid.json());
  const aView = SessionViewSchema.parse(await (await fetch(pathA, { headers: auth(a.accessToken) })).json());
  assert.equal(aView.session.status, 'active');
  assert.equal(aView.events[1]?.eventId, failure.error.eventId);
  assert.equal(aView.events[1]?.type, 'ERROR_OCCURRED');
  assert.ok(!JSON.stringify(aView).includes('secret'));
  assert.ok(!JSON.stringify(aView).includes(a.accessToken));
  const end = async () => SessionViewSchema.parse(await (await fetch(pathA + '/end', { method: 'POST', headers: auth(a.accessToken) })).json());
  const ended = await end(); assert.deepEqual(await end(), ended);
  assert.deepEqual(ended.events.map(e => e.type), ['SESSION_STARTED', 'ERROR_OCCURRED', 'SESSION_ENDED']);
  const bView = SessionViewSchema.parse(await (await fetch(pathB, { headers: auth(b.accessToken) })).json());
  assert.equal(bView.session.status, 'active');
  assert.deepEqual(bView.events.map(e => e.type), ['SESSION_STARTED']);
});

test('bad IDs, unknown routes, and unsupported payloads fail without creating sessions', async t => {
  const { url, store, fetch } = await fixture(t);
  for (const [path, init, status] of [
    ['/api/sessions/not-a-uuid', {}, 400],
    ['/api/sessions/' + randomUUID(), {}, 404],
    ['/api/missing', {}, 404],
    ['/api/sessions', { method: 'POST', body: '{"productPackId":"unsupported"}' }, 400],
  ] as const) {
    const response = await fetch(url + path, init); assert.equal(response.status, status);
    ApiErrorSchema.parse(await response.json());
  }
  assert.equal(store.getSystemEvents().length, 4);
  assert.ok(store.getSystemEvents().every(e => e.type === 'ERROR_OCCURRED' && e.sessionId === null));
});

test('unexpected backend errors produce sanitized ERROR_OCCURRED responses', async t => {
  class FailingStore extends SessionStore {
    override create(): never { throw new Error('sensitive debug text'); }
  }
  const { url, store, fetch } = await fixture(t, { store: new FailingStore() });
  const response = await fetch(url + '/api/sessions', { method: 'POST' });
  assert.equal(response.status, 500);
  const body = ApiErrorSchema.parse(await response.json());
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.ok(!JSON.stringify(body).includes('sensitive'));
  assert.equal(store.getSystemEvents()[0]?.eventId, body.error.eventId);
});

test('production HTTP server serves built-style assets and rejects traversal', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gde-static-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(join(dir, 'index.html'), '<html>Demo Twin</html>');
  await writeFile(join(dir, 'app.js'), 'console.log("shell")');
  const { url, fetch } = await fixture(t, { staticDir: dir });
  assert.match(await (await fetch(url + '/')).text(), /Demo Twin/);
  assert.match((await fetch(url + '/app.js')).headers.get('content-type') ?? '', /javascript/);
  assert.equal((await fetch(url + '/%2e%2e%2fpackage.json')).status, 404);
  assert.equal((await fetch(url + '/missing.js')).status, 404);
});
