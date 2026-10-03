import { runtimeFor } from '../packages/product-packs/runtimes.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../apps/server/src/app.js';
import { SessionStore } from '../packages/engine/src/sessions.js';
import { ApiErrorSchema, CreatedSessionSchema, HealthSchema, ProductPresentationSchema, SessionViewSchema, SnapshotSchema } from '../packages/contracts/src/index.js';
import type { Command } from '../packages/contracts/src/state.js';
import { loadProductPack } from '../packages/product-packs/loader.js';
import { memoryFetch } from './transport.js';

async function fixture(t: test.TestContext, options: Partial<Parameters<typeof createApp>[0]> = {}) {
  const pack = await loadProductPack('packages/product-packs/acme/pack.json');
  const app = createApp({ pack, runtime: runtimeFor(options.pack ?? pack), ...options });
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

test('manual navigation follows the fixed walkthrough and isolates session selection', async t => {
  const { url, fetch } = await fixture(t);
  const { DemoPresentationSchema } = await import('../packages/contracts/src/presentation.js');
  const demo = DemoPresentationSchema.parse(await (await fetch(url + '/api/demo-presentation')).json());
  const start = async () => CreatedSessionSchema.parse(await (await fetch(url + '/api/sessions', { method: 'POST' })).json());
  const a = await start(); const b = await start();
  const path = url + '/api/sessions/' + a.session.sessionId;
  assert.equal(a.session.demoState.currentScreen, demo.homeScreenId);
  for (const target of [...demo.walkthrough.map(link => link.target), ...demo.navigation.map(link => link.target), ...demo.screens.flatMap(screen => screen.links.map(link => link.target)), { screenId: 'sample-1002', recordId: 'SMP-1002' }]) {
    const response = await fetch(path + '/navigation', { method: 'POST', headers: { ...auth(a.accessToken), 'Content-Type': 'application/json' }, body: JSON.stringify(target) });
    assert.equal(response.status, 200);
    const view = SessionViewSchema.parse(await response.json());
    assert.equal(view.session.demoState.currentScreen, target.screenId);
    assert.equal(view.session.demoState.selectedRecordId, target.recordId);
    assert.equal(view.events[0]?.type, 'SESSION_STARTED');
    assert.deepEqual(view.events.slice(-3).map(event => event.type), ['COMMAND_REQUESTED', 'COMMAND_APPROVED', 'STATE_CHANGED']);
  }
  const other = SessionViewSchema.parse(await (await fetch(url + '/api/sessions/' + b.session.sessionId, { headers: auth(b.accessToken) })).json());
  assert.deepEqual(other, { session: b.session, events: b.events, questions: b.questions, workspace: b.workspace, chat: b.chat });
  assert.deepEqual(await (await fetch(url + '/api/demo-presentation')).json(), demo);
});

test('navigation rejects unauthorized, malformed, mismatched and ended requests without changing state', async t => {
  const { url, fetch } = await fixture(t);
  const a = CreatedSessionSchema.parse(await (await fetch(url + '/api/sessions', { method: 'POST' })).json());
  const path = url + '/api/sessions/' + a.session.sessionId;
  const target = { screenId: 'sample-1001', recordId: 'SMP-1001' };
  const navigate = (body: string, headers = { ...auth(a.accessToken), 'Content-Type': 'application/json' }) => fetch(path + '/navigation', { method: 'POST', headers, body });
  assert.equal((await navigate(JSON.stringify(target), { Authorization: 'Bearer wrong', 'Content-Type': 'application/json' })).status, 403);
  for (const body of ['{', JSON.stringify({ ...target, screenId: 'unknown' }), JSON.stringify({ ...target, recordId: 'SMP-1002' }), JSON.stringify({ ...target, extra: true }), ' '.repeat(4097)]) {
    assert.equal((await navigate(body)).status, 400);
  }
  assert.equal((await navigate(JSON.stringify(target), { ...auth(a.accessToken), 'Content-Type': 'text/plain' })).status, 400);
  const before = SessionViewSchema.parse(await (await fetch(path, { headers: auth(a.accessToken) })).json());
  assert.deepEqual(before.session.demoState, a.session.demoState);
  assert.equal(before.events.filter(event => event.type === 'ERROR_OCCURRED').length, 6);
  await fetch(path + '/end', { method: 'POST', headers: auth(a.accessToken) });
  const ended = await navigate(JSON.stringify(target));
  assert.equal(ended.status, 409);
  assert.equal(ApiErrorSchema.parse(await ended.json()).error.code, 'SESSION_ENDED');
  const after = SessionViewSchema.parse(await (await fetch(path, { headers: auth(a.accessToken) })).json());
  assert.deepEqual(after.session.demoState, a.session.demoState);
});

test('a dynamically loaded alternative Pack changes API presentation without core edits', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gde-http-pack-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const original = await loadProductPack('packages/product-packs/acme/pack.json');
  const changed = structuredClone(original);
  changed.metadata.packId = changed.presentation.packId = 'acme-alternate';
  changed.metadata.name = 'Acme Configured Demo';
  changed.presentation.homeScreenId = 'sample-list';
  changed.presentation.screens.find(screen => screen.id === 'sample-list')!.title = 'Configured sample register';
  changed.lanes[0]!.description = 'Configured lane narrative';
  const path = join(dir, 'configured.json'); await writeFile(path, JSON.stringify(changed));
  const loaded = await loadProductPack(path);
  const { url, fetch } = await fixture(t, { pack: loaded });
  // Composition takes a validated copy; external config mutation cannot alter a running app.
  loaded.metadata.name = 'External mutation';
  const { ProductPackSchema } = await import('../packages/contracts/src/product-pack.js');
  const manifest = ProductPackSchema.parse(await (await fetch(url + '/api/product-pack/manifest')).json());
  assert.equal(manifest.metadata.name, 'Acme Configured Demo');
  assert.equal(manifest.lanes[0]?.description, 'Configured lane narrative');
  const created = CreatedSessionSchema.parse(await (await fetch(url + '/api/sessions', { method: 'POST' })).json());
  assert.equal(created.session.productPackId, 'acme-alternate');
  assert.equal(created.session.demoState.currentScreen, 'sample-list');
  const blueprint = await (await fetch(url + '/api/demo-presentation')).json();
  assert.equal(blueprint.screens.find((screen: { id: string }) => screen.id === 'sample-list').title, 'Configured sample register');
  assert.deepEqual(await loadProductPack('packages/product-packs/acme/pack.json'), original);
  // Unregistered routes cannot bypass the controller.
  assert.equal((await fetch(url + '/api/sessions/' + created.session.sessionId + '/actions', { method: 'POST', headers: auth(created.accessToken) })).status, 404);
});

test('HTTP commands execute the golden path, reject stale/invalid requests and restore canonical snapshots', async t => {
  const { url, fetch } = await fixture(t);
  const start = async () => CreatedSessionSchema.parse(await (await fetch(url + '/api/sessions', { method: 'POST' })).json());
  const a = await start(), b = await start();
  const path = url + '/api/sessions/' + a.session.sessionId;
  const headers = { ...auth(a.accessToken), 'Content-Type': 'application/json' };
  let view = SessionViewSchema.parse({ session: a.session, events: a.events, workspace: a.workspace });
  const request = (body: unknown) => fetch(path + '/commands', { method: 'POST', headers, body: JSON.stringify(body) });
  const send = async (type: Command['type'], args: Command['args'] = {}) => {
    const response = await request({ type, args, expectedRevision: view.session.revision });
    assert.equal(response.status, 200); view = SessionViewSchema.parse(await response.json());
  };
  assert.equal((await fetch(path + '/commands', { method: 'POST', headers: auth(b.accessToken), body: '{}' })).status, 403);
  for (const body of [{ type: 'BYPASS', args: {}, expectedRevision: 0 }, { type: 'RESET', args: {}, expectedRevision: 0, productState: {} }]) {
    assert.equal((await request(body)).status, 400);
  }
  await send('START_TEST', { recordId: 'TST-1001' });
  const before = structuredClone(view.session);
  const stale = await request({ type: 'RESET', args: {}, expectedRevision: 0 });
  assert.equal(stale.status, 409); assert.equal(ApiErrorSchema.parse(await stale.json()).error.code, 'REVISION_CONFLICT');
  assert.deepEqual(SessionViewSchema.parse(await (await fetch(path, { headers })).json()).session, before);
  await send('ENTER_RESULT', { recordId: 'TST-1001', value: 6.4, unit: 'pH' });
  await send('SUBMIT_TEST', { recordId: 'TST-1001' });
  await send('TRIGGER_EXCEPTION', { recordId: 'RES-1001' });
  await send('SUBMIT_FOR_REVIEW', { recordId: 'SMP-1001' });
  await send('SWITCH_ROLE', { roleId: 'qa' });
  const pending = structuredClone(view.session);
  const blocked = await request({ type: 'APPROVE', args: { recordId: 'REV-1001', rationale: 'Unresolved evidence' }, expectedRevision: view.session.revision });
  assert.equal(blocked.status, 409);
  assert.deepEqual(SessionViewSchema.parse(await (await fetch(path, { headers })).json()).session, pending);
  await send('RESOLVE_EXCEPTION', { recordId: 'EXC-1001', disposition: 'Synthetic evidence disposition.' });
  await send('APPROVE', { recordId: 'REV-1001', rationale: 'Synthetic disposition reviewed.' });
  await send('NAVIGATE', { screenId: 'review-1001', recordId: 'SMP-1001' });
  const restored = SessionViewSchema.parse(await (await fetch(path, { headers })).json());
  assert.deepEqual(restored, view);
  const snapshot = SnapshotSchema.parse(await (await fetch(path + '/snapshot', { headers })).json());
  assert.deepEqual(snapshot.session, view.session); assert.ok(!('events' in snapshot));
  assert.equal(snapshot.lastEventSequence, view.events.length);
  assert.equal(view.session.productState.records.find(record => record.id === 'SMP-1001')?.state, 'approved');
  assert.equal(view.workspace!.presentation.screens.find(screen => screen.id === 'review-1001')!.badge.label, 'approved');
  assert.ok(!JSON.stringify(view.events).includes('Unresolved evidence'));
  assert.deepEqual(SessionViewSchema.parse(await (await fetch(url + '/api/sessions/' + b.session.sessionId, { headers: auth(b.accessToken) })).json()).session, b.session);
  await fetch(path + '/end', { method: 'POST', headers: auth(a.accessToken) });
  assert.equal((await request({ type: 'RESET', args: {}, expectedRevision: view.session.revision })).status, 409);
  assert.equal((await fetch(path + '/snapshot', { headers: auth(b.accessToken) })).status, 403);
});

test('text turns are authorized, inspectable and isolated through HTTP', async t => {
  let output: unknown = { understanding: { intent: 'navigate', summary: 'Open a record.', confidence: 0.9 }, customerModelUpdates: [], requestedActions: [{ type: 'NAVIGATE', args: [{ name: 'screenId', value: 'sample-1001' }, { name: 'recordId', value: 'SMP-1001' }] }], narrationIntent: 'current_view', questionHandling: 'none', nextStep: 'listen' }, calls = 0;
  const { url, fetch } = await fixture(t, { provider: { name: 'test-provider', model: 'fixture-only', propose: async () => { calls++; return output; } } });
  const start = async () => CreatedSessionSchema.parse(await (await fetch(url + '/api/sessions', { method: 'POST' })).json());
  const a = await start(), b = await start(), path = url + '/api/sessions/' + a.session.sessionId;
  const headers = { ...auth(a.accessToken), 'Content-Type': 'application/json' };
  const send = (body: unknown, supplied = headers) => fetch(path + '/turns', { method: 'POST', headers: supplied, body: JSON.stringify(body) });
  assert.equal((await send({ text: 'Open the first record.', expectedRevision: 0 }, { ...headers, ...auth(b.accessToken) })).status, 403);
  for (const body of [{ text: '', expectedRevision: 0 }, { text: 'x'.repeat(2001), expectedRevision: 0 }, { text: 'Open.', expectedRevision: 0, state: {} }]) assert.equal((await send(body)).status, 400);
  assert.equal(calls, 0);
  const opened = SessionViewSchema.parse(await (await send({ text: 'Open the first record.', expectedRevision: 0 })).json());
  assert.equal(opened.session.demoState.currentScreen, 'sample-1001'); assert.equal(calls, 1);
  assert.equal(opened.chat!.turns[0]!.customerText, 'Open the first record.');
  assert.equal(opened.chat!.turns[0]!.status, 'completed');
  assert.equal((await send({ text: 'Show QA.', expectedRevision: 0 })).status, 409);
  output = { invalid: true };
  const malformed = SessionViewSchema.parse(await (await send({ text: 'Show QA.', expectedRevision: 1 })).json());
  assert.deepEqual(malformed.session, opened.session); assert.equal(malformed.chat!.turns.at(-1)!.errorCode, 'MODEL_OUTPUT_INVALID');
  const captured = SessionViewSchema.parse(await (await send({ text: 'Does it integrate with SAP?', expectedRevision: 1 })).json());
  assert.equal(calls, 2); assert.equal(captured.session.conversationState.outstandingQuestions[0]!.text, 'Does it integrate with SAP?');
  assert.deepEqual(SessionViewSchema.parse(await (await fetch(path, { headers })).json()), captured);
  const snapshot = SnapshotSchema.parse(await (await fetch(path + '/snapshot', { headers })).json());
  assert.deepEqual(snapshot.session, captured.session); assert.ok(!('turns' in snapshot)); assert.ok(!('events' in snapshot));
  assert.deepEqual(SessionViewSchema.parse(await (await fetch(url + '/api/sessions/' + b.session.sessionId, { headers: auth(b.accessToken) })).json()).session, b.session);
  const ended = SessionViewSchema.parse(await (await send({ text: 'End the demo', expectedRevision: captured.session.revision })).json());
  assert.equal(ended.session.status, 'ended');
  assert.equal((await send({ text: 'Show QA.', expectedRevision: ended.session.revision })).status, 409);
});

test('unconfigured chat has no fake provider; manual controls still work', async t => {
  const { url, fetch } = await fixture(t);
  const created = CreatedSessionSchema.parse(await (await fetch(url + '/api/sessions', { method: 'POST' })).json());
  const path = url + '/api/sessions/' + created.session.sessionId, headers = { ...auth(created.accessToken), 'Content-Type': 'application/json' };
  assert.equal(created.chat!.available, false);
  const failed = SessionViewSchema.parse(await (await fetch(path + '/turns', { method: 'POST', headers, body: JSON.stringify({ text: 'Show the first record.', expectedRevision: 0 }) })).json());
  assert.deepEqual(failed.session, created.session); assert.equal(failed.chat!.turns[0]!.errorCode, 'PROVIDER_UNAVAILABLE');
  assert.equal((await fetch(path + '/commands', { method: 'POST', headers, body: JSON.stringify({ type: 'NAVIGATE', expectedRevision: 0, args: { screenId: 'sample-list', recordId: null } }) })).status, 200);
});

test('governed answers and escalations preserve first-class questions, knowledge events and pinned versions over HTTP', async t => {
  const { ClaimGuard } = await import('../packages/knowledge/src/claim-guard.js');
  const guard = new ClaimGuard(); let calls = 0;
  const {url,fetch} = await fixture(t,{provider:{name:'fixture',model:'fixture',propose:async req=>{
    calls++; const context=JSON.parse(req.context);
    return {understanding:{intent:'question',summary:'Answer only approved evidence.',confidence:1},customerModelUpdates:[],requestedActions:[],narrationIntent:'none',questionHandling:'none',nextStep:'listen',answerPlan:guard.defaultPlan(context.governedKnowledge)};
  }}});
  const created=CreatedSessionSchema.parse(await (await fetch(url+'/api/sessions',{method:'POST'})).json());
  const path=url+'/api/sessions/'+created.session.sessionId, headers={...auth(created.accessToken),'Content-Type':'application/json'};
  const {accessToken: _token, ...initialView}=created;
  let view=SessionViewSchema.parse(initialView);
  for(const text of ['How are samples linked to tests?','Explain how a measurement flows to an exception and review.','Does this integrate directly with SAP S/4HANA?','What about that?']) {
    view=SessionViewSchema.parse(await (await fetch(path+'/turns',{method:'POST',headers,body:JSON.stringify({text,expectedRevision:view.session.revision})})).json());
    assert.deepEqual(view.session.productState,created.session.productState);assert.deepEqual(view.session.demoState,created.session.demoState);
  }
  assert.equal(calls,2);assert.deepEqual(view.questions.map(q=>q.status),['ANSWERED','ANSWERED','ESCALATED','UNRESOLVED']);
  assert.deepEqual(view.questions.map(q=>q.answerMode),['APPROVED_QA','EVIDENCE_SYNTHESIS','ESCALATION',null]);
  assert.ok(view.questions.every(q=>q.knowledgeVersion===created.session.knowledgeVersion));
  for(const type of ['KNOWLEDGE_RETRIEVED','APPROVED_ANSWER_USED','QUESTION_ESCALATED'])assert.ok(view.events.some(event=>event.type===type));
  assert.deepEqual(SessionViewSchema.parse(await (await fetch(path,{headers})).json()),view);
  assert.deepEqual(SnapshotSchema.parse(await (await fetch(path+'/snapshot',{headers})).json()).questions,view.questions);
  assert.equal((await fetch(path,{headers:auth(randomUUID())})).status,403);
});
