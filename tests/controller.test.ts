import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductPack } from '../packages/product-packs/loader.js';
import { acmeRuntime } from '../packages/product-packs/acme/runtime.js';
import { SessionStore } from '../packages/engine/src/sessions.js';
import { DemoController } from '../packages/engine/src/controller.js';
import { SnapshotSchema } from '../packages/contracts/src/index.js';
import type { Command } from '../packages/contracts/src/state.js';
import type { PackRuntime } from '../packages/contracts/src/runtime.js';
const pack = await loadProductPack('packages/product-packs/acme/pack.json');
function setup(runtime: PackRuntime = acmeRuntime) {
  const store = new SessionStore(), controller = new DemoController(pack, store, runtime);
  const id = controller.create().session.sessionId;
  const send = (type: Command['type'], args: Command['args'] = {}) => controller.execute(id, { type, args, expectedRevision: store.get(id).session.revision });
  const record = (id: string) => store.get(idForRead).session.productState.records.find(record => record.id === id)!;
  const idForRead = id;
  return { store, controller, id, send, record };
}
function throughReview(run: ReturnType<typeof setup>, value = 6.4) {
  run.send('START_TEST', { recordId: 'TST-1001' });
  run.send('ENTER_RESULT', { recordId: 'TST-1001', value, unit: 'pH' });
  run.send('SUBMIT_TEST', { recordId: 'TST-1001' });
  run.send('TRIGGER_EXCEPTION', { recordId: 'RES-1001' });
  run.send('SUBMIT_FOR_REVIEW', { recordId: 'SMP-1001' });
  run.send('SWITCH_ROLE', { roleId: 'qa' });
}

test('golden failing-result workflow enforces rejection, resolution and atomic QA/sample approval', () => {
  const run = setup();
  assert.equal(run.record('SMP-1001').state, 'received');
  assert.equal(run.record('RES-1001'), undefined);
  throughReview(run);
  assert.equal(run.record('RES-1001').values.assessment, 'below-range');
  assert.equal(run.record('EXC-1001').state, 'open');
  assert.equal(run.record('REV-1001').state, 'pending');
  const before = run.store.get(run.id).session;
  assert.throws(() => run.send('APPROVE', { recordId: 'REV-1001', rationale: 'Premature decision' }), /ACTION_REJECTED/);
  assert.deepEqual(run.store.get(run.id).session, before);
  run.send('RESOLVE_EXCEPTION', { recordId: 'EXC-1001', disposition: 'Synthetic disposition: evidence reviewed, no real release.' });
  const result = run.send('APPROVE', { recordId: 'REV-1001', rationale: 'Synthetic QA evidence and disposition reviewed.' });
  assert.equal(run.record('SMP-1001').state, 'approved');
  assert.equal(run.record('REV-1001').state, 'approved');
  assert.equal(result.session.revision, 8);
  assert.ok(result.events.some(event => event.type === 'COMMAND_REJECTED'));
  assert.deepEqual(result.events.slice(-3).map(event => event.type), ['COMMAND_REQUESTED', 'COMMAND_APPROVED', 'STATE_CHANGED']);
  assert.equal(new Set(result.events.map(event => event.eventId)).size, result.events.length);
  assert.deepEqual(result.events.map(event => event.sequence), result.events.map((_, index) => index + 1));
  assert.ok(!JSON.stringify(result.events).includes('Premature decision'));
});

test('boundary pH values pass; below/above range creates exactly one linked exception', () => {
  for (const [value, expected] of [[6.8, 'within-range'], [7.2, 'within-range'], [6.79, 'below-range'], [7.21, 'above-range']] as const) {
    const run = setup(); throughReview(run, value);
    assert.equal(run.record('RES-1001').values.assessment, expected);
    assert.equal(run.store.get(run.id).session.productState.records.filter(record => record.entityType === 'Exception').length, expected === 'within-range' ? 0 : 1);
    if (expected === 'within-range') {
      run.send('APPROVE', { recordId: 'REV-1001', rationale: 'Synthetic in-range evidence reviewed.' });
      assert.equal(run.record('SMP-1001').state, 'approved');
    }
  }
});

test('bad state, role, inputs and duplicate assessment do not alter canonical state', () => {
  const run = setup();
  const reject = (type: Command['type'], args: Command['args']) => {
    const before = run.store.get(run.id).session;
    assert.throws(() => run.send(type, args)); assert.deepEqual(run.store.get(run.id).session, before);
  };
  reject('ENTER_RESULT', { recordId: 'TST-1001', value: 6.4, unit: 'pH' });
  reject('SUBMIT_FOR_REVIEW', { recordId: 'SMP-1001' });
  run.send('SWITCH_ROLE', { roleId: 'qa' }); reject('START_TEST', { recordId: 'TST-1001' });
  run.send('SWITCH_ROLE', { roleId: 'analyst' }); run.send('START_TEST', { recordId: 'TST-1001' });
  reject('SUBMIT_TEST', { recordId: 'TST-1001' });
  reject('ENTER_RESULT', { recordId: 'TST-1001', value: 15, unit: 'pH' });
  reject('ENTER_RESULT', { recordId: 'TST-1001', value: 6.4, unit: 'wrong' });
  reject('ENTER_RESULT', { recordId: 'TST-1001', value: 6.4, unit: 'pH', secret: 'do not log' });
  run.send('ENTER_RESULT', { recordId: 'TST-1001', value: 6.4, unit: 'pH' });
  reject('TRIGGER_EXCEPTION', { recordId: 'RES-1001' });
  run.send('SUBMIT_TEST', { recordId: 'TST-1001' }); run.send('TRIGGER_EXCEPTION', { recordId: 'RES-1001' });
  reject('TRIGGER_EXCEPTION', { recordId: 'RES-1001' });
  assert.ok(!JSON.stringify(run.store.get(run.id).events).includes('secret'));
});

test('compound actions roll back earlier transitions when a later handler fails', () => {
  const runtime = { ...acmeRuntime, handlers: { ...acmeRuntime.handlers, 'start-test': (context: Parameters<PackRuntime['handlers'][string]>[0]) => context.transition(context.subject.id, 'completed') } };
  const run = setup(runtime); const before = run.store.get(run.id).session;
  assert.throws(() => run.send('START_TEST', { recordId: 'TST-1001' }), /ACTION_REJECTED/);
  assert.deepEqual(run.store.get(run.id).session, before);
});

test('handler writes cannot bypass schemas/references, and read copies cannot mutate state', () => {
  for (const handler of [
    (context: Parameters<PackRuntime['handlers'][string]>[0]) => { context.set(context.subject.id, 'sampleId', 'missing'); },
    (context: Parameters<PackRuntime['handlers'][string]>[0]) => { context.set(context.subject.id, 'inventedField', 'invalid'); },
  ]) {
    const run = setup({ ...acmeRuntime, handlers: { ...acmeRuntime.handlers, 'start-test': handler } });
    const before = run.store.get(run.id).session;
    assert.throws(() => run.send('START_TEST', { recordId: 'TST-1001' }));
    assert.deepEqual(run.store.get(run.id).session, before);
  }
  const run = setup({ ...acmeRuntime, handlers: { ...acmeRuntime.handlers, 'start-test': context => {
    context.subject.values.sampleId = 'missing';
    context.find('SMP-1002').state = 'approved';
    context.records('Sample')[1]!.state = 'approved';
    context.transition(context.subject.id, 'in-progress');
  } } });
  run.send('START_TEST', { recordId: 'TST-1001' });
  assert.equal(run.record('TST-1001').values.sampleId, 'SMP-1001');
  assert.equal(run.record('SMP-1002').state, 'received');
});

test('snapshot is detached current state without event history; stale command revisions reject', () => {
  const run = setup(); throughReview(run);
  const snapshot = SnapshotSchema.parse(run.store.snapshot(run.id));
  assert.deepEqual(snapshot.session, run.store.get(run.id).session);
  assert.equal(snapshot.lastEventSequence, run.store.get(run.id).events.length);
  assert.ok(!('events' in snapshot));
  snapshot.session.productState.records[0]!.values.version = 'mutated';
  assert.notEqual(run.store.get(run.id).session.productState.records[0]!.values.version, 'mutated');
  const before = run.store.get(run.id).session;
  assert.throws(() => run.controller.execute(run.id, { type: 'RESET', expectedRevision: 0, args: {} }), /REVISION_CONFLICT/);
  assert.deepEqual(run.store.get(run.id).session, before);
});

test('all generic navigation/context commands remain distinct from ProductState', () => {
  const run = setup(); const before = run.store.get(run.id).session.productState;
  for (const type of ['NAVIGATE', 'OPEN_RECORD', 'SHOW', 'OPEN_EXCEPTION', 'SHOW_AUDIT_HISTORY'] as const) run.send(type, { screenId: 'sample-1001', recordId: 'SMP-1001' });
  run.send('HIGHLIGHT', { field: 'Material' });
  assert.deepEqual(run.store.get(run.id).session.demoState.highlights, ['Material']);
  run.send('NAVIGATE', { screenId: 'sample-list', recordId: null });
  run.send('FILTER', { query: '1002' });
  assert.equal(run.controller.view(run.id).session.demoState.filters['sample-list'], '1002');
  run.send('RETURN'); assert.equal(run.store.get(run.id).session.demoState.selectedRecordId, 'SMP-1001');
  run.send('SET_LANE', { laneId: 'lab-execution' });
  assert.equal(run.store.get(run.id).session.demoState.currentLane, 'lab-execution');
  assert.deepEqual(run.store.get(run.id).session.productState, before);
});

test('bounded configuration generates deterministic data; site scopes and reset preserve isolation', () => {
  const run = setup(); const other = run.controller.create();
  run.send('SET_PARAMETER', { parameterId: 'site_count', value: 2 });
  run.send('SET_PARAMETER', { parameterId: 'sample_count', value: 4 });
  run.send('SET_PARAMETER', { parameterId: 'external_partner_count', value: 2 });
  run.send('SET_PARAMETER', { parameterId: 'sample_source', value: 'mixed' });
  assert.equal(run.store.get(run.id).session.productState.records.filter(record => record.entityType === 'Sample').length, 4);
  assert.equal(run.record('SMP-1002').values.source, 'external');
  run.send('SWITCH_SITE', { siteId: 'ridge' });
  const before = run.store.get(run.id).session;
  assert.throws(() => run.send('START_TEST', { recordId: 'TST-1001' }), /ACTION_REJECTED/);
  assert.deepEqual(run.store.get(run.id).session, before);
  run.send('START_TEST', { recordId: 'TST-1002' });
  assert.equal(run.record('SMP-1002').state, 'in-testing');
  assert.throws(() => run.send('SET_PARAMETER', { parameterId: 'sample_count', value: 13 }));
  run.send('RESET');
  assert.equal(run.record('SMP-1001').state, 'received');
  assert.deepEqual(run.store.get(run.id).session.productState, other.session.productState);
  assert.deepEqual(run.controller.view(other.session.sessionId), other);
  assert.ok(run.store.get(run.id).events.some(event => event.commandType === 'RESET'));
});

test('workspace values, availability and audit history follow canonical state', () => {
  const run = setup(); throughReview(run);
  run.send('NAVIGATE', { screenId: 'results-1001', recordId: 'SMP-1001' });
  const view = run.controller.view(run.id);
  const row = view.workspace!.presentation.screens.find(screen => screen.id === 'results-1001')!.table!.rows[0]!;
  assert.equal(row.cells.value, String(run.record('RES-1001').values.value));
  assert.equal(row.cells.assessment, run.record('RES-1001').values.assessment);
  const audit = view.workspace!.presentation.screens.find(screen => screen.id === 'audit-1001')!;
  assert.equal(audit.table!.rows.length, view.events.filter(event => event.commandId).length);
  assert.ok(audit.table!.rows.some(row => row.cells.command === 'ENTER_RESULT'));
});

test('failing assessments require their exception and invalid specification fails before session creation', () => {
  const run = setup({ ...acmeRuntime, handlers: { ...acmeRuntime.handlers, 'assess-result': context => {
    context.set(context.subject.id, 'assessment', 'below-range'); context.transition(context.subject.id, 'assessed');
  } } });
  run.send('START_TEST', { recordId: 'TST-1001' });
  run.send('ENTER_RESULT', { recordId: 'TST-1001', value: 6.4, unit: 'pH' });
  run.send('SUBMIT_TEST', { recordId: 'TST-1001' });
  const before = run.store.get(run.id).session;
  assert.throws(() => run.send('TRIGGER_EXCEPTION', { recordId: 'RES-1001' }));
  assert.deepEqual(run.store.get(run.id).session, before);
  const invalid = structuredClone(pack);
  invalid.productModel.records.find(record => record.entityType === 'Specification')!.values.phMinimum = 8;
  assert.throws(() => new DemoController(invalid, new SessionStore(), acmeRuntime));
});
