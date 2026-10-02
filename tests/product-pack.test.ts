import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadProductPack } from '../packages/product-packs/loader.js';
import { ProductPackSchema, parsePackParameters } from '../packages/contracts/src/product-pack.js';

const pack = await loadProductPack('packages/product-packs/acme/pack.json');

test('Acme defines four reachable lanes, role-scoped actions and linked fictional product evidence', () => {
  assert.deepEqual(pack.lanes.map(lane => lane.label), ['Sample Management', 'Lab Execution', 'Exception/OOS', 'QA Review']);
  assert.deepEqual(pack.roles.map(role => role.label), ['Analyst', 'QA', 'Lab Manager']);
  assert.equal(pack.productModel.entityTypes.length, 6);
  for (const action of pack.productModel.actions.filter(action => /approve|resolve/.test(action.id))) assert.deepEqual(action.roles, ['qa']);
  const approval = pack.productModel.actions.find(action => action.id === 'approve-sample')!;
  for (const guard of ['tests-exist', 'tests-complete', 'exceptions-resolved', 'reviews-exist', 'reviews-approved']) assert.ok(approval.guardIds.includes(guard));
  const review = pack.productModel.actions.find(action => action.id === 'approve-review')!;
  assert.deepEqual(review.guardBindings.find(binding => binding.guardId === 'review-rationale'), { guardId: 'review-rationale', phase: 'proposed' });
  assert.equal(pack.policy.execution, 'definitions-only');
  assert.equal(pack.truth.scope, 'fictional-demo-only');
});

test('parameter validation uses Pack bounds/defaults and rejects unknown fields without coercion', () => {
  assert.deepEqual(parsePackParameters(pack, {}), { site_count: 1, external_partner_count: 0, sample_count: 2, sample_source: 'internal', result_profile: 'mixed' });
  for (const parameter of pack.parameters) {
    if (parameter.kind === 'integer') {
      assert.equal(parsePackParameters(pack, { [parameter.id]: parameter.min })[parameter.id], parameter.min);
      assert.equal(parsePackParameters(pack, { [parameter.id]: parameter.max })[parameter.id], parameter.max);
      for (const value of [parameter.min - 1, parameter.max + 1, 1.5, '2', null]) assert.throws(() => parsePackParameters(pack, { [parameter.id]: value }));
    } else {
      for (const value of parameter.values) assert.equal(parsePackParameters(pack, { [parameter.id]: value })[parameter.id], value);
      assert.throws(() => parsePackParameters(pack, { [parameter.id]: 'unapproved' }));
    }
  }
  assert.throws(() => parsePackParameters(pack, { unknown: 1 }));
});

test('Pack rejects malformed version, identity, bounds, model, rule, lane and truth references', () => {
  const mutations: Array<(copy: typeof pack) => void> = [
    copy => { copy.schemaVersion = 'unknown' as '1.0'; },
    copy => { copy.version = 'latest'; },
    copy => { copy.presentation.packId = 'other'; },
    copy => { const p = copy.parameters.find(p => p.kind === 'integer')!; if (p.kind === 'integer') p.default = p.max + 1; },
    copy => { copy.roles.push(copy.roles[0]!); },
    copy => { copy.productModel.records[0]!.state = 'invalid'; },
    copy => { copy.productModel.records[0]!.values.material = 12; },
    copy => { copy.productModel.records.find(record => record.entityType === 'Test')!.values.sampleId = 'missing'; },
    copy => { copy.productModel.records.find(record => record.entityType === 'Test')!.values.sampleId = 'REV-1001'; },
    copy => { delete copy.productModel.records[0]!.values.material; },
    copy => { copy.productModel.actions[0]!.roles.push('unknown'); },
    copy => { copy.productModel.actions[0]!.guardBindings = []; },
    copy => { copy.productModel.actions[0]!.guardBindings[0]!.subjectField = 'batch'; },
    copy => { copy.productModel.actions[0]!.handler.effects[0]!.targetState = 'invalid'; },
    copy => { copy.productModel.transitions[0]!.actionId = 'approve-review'; },
    copy => { copy.productModel.invariants[0]!.predicate.field = 'missing'; },
    copy => { copy.lanes[0]!.nodes[0]!.target.screenId = 'missing'; },
    copy => { copy.lanes[0]!.edges = []; },
    copy => { copy.lanes[0]!.parameterIds.push('unbounded'); },
    copy => { copy.truth.facts[0]!.evidenceIds = ['missing']; },
    copy => { copy.truth.approvedQA[0]!.factIds = ['missing']; },
    copy => { copy.policy.execution = 'enabled' as 'definitions-only'; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const copy = structuredClone(pack); mutate(copy);
    assert.equal(ProductPackSchema.safeParse(copy).success, false, `Mutation ${index} must fail`);
  }
});

test('typed seed records agree with the visible synthetic walkthrough', () => {
  const record = (id: string) => pack.productModel.records.find(record => record.id === id)!;
  const result = pack.presentation.screens.find(screen => screen.kind === 'results')!.table!.rows.find(row => row.id === 'RES-1001')!;
  assert.equal(result.cells.value, String(record('RES-1001').values.value));
  const range = record('SPEC-CB-01').values;
  assert.equal(result.cells.range, `${range.phMinimum}–${range.phMaximum}`);
  assert.equal(record('EXC-1001').values.resultId, 'RES-1001');
  assert.equal(record('REV-1001').values.sampleId, 'SMP-1001');
  assert.equal(record('REV-1001').state, 'pending');
  assert.equal(record('EXC-1001').state, 'in-review');
  assert.equal(record('EXC-1001').values.disposition, null);
});

test('dynamic loader is data-only and rejects invalid/missing files', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gde-pack-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'pack.json');
  const changed = structuredClone(pack);
  changed.metadata.name = 'Acme Alternate Demo';
  changed.presentation.screens[0]!.title = 'Configured queue title';
  await writeFile(path, JSON.stringify(changed));
  assert.equal((await loadProductPack(path)).presentation.screens[0]!.title, 'Configured queue title');
  await writeFile(path, '{"script":"execute me"}');
  await assert.rejects(loadProductPack(path));
  await writeFile(path, '{'); await assert.rejects(loadProductPack(path));
  await assert.rejects(loadProductPack(join(dir, 'missing.json')));
});
