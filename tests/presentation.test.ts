import test from 'node:test';
import assert from 'node:assert/strict';
import { DemoPresentationSchema } from '../packages/contracts/src/presentation.js';
import { loadProductPack } from '../packages/product-packs/loader.js';
const { presentation: acmeDemoPresentation } = await loadProductPack('packages/product-packs/acme/pack.json');
import { SessionStore } from '../packages/engine/src/sessions.js';

test('presentation rejects broken links, duplicate screen IDs and missing table cells', () => {
  const broken = structuredClone(acmeDemoPresentation);
  broken.walkthrough[0]!.target.screenId = 'missing';
  assert.equal(DemoPresentationSchema.safeParse(broken).success, false);
  const duplicate = structuredClone(acmeDemoPresentation);
  duplicate.screens.push(duplicate.screens[0]!);
  assert.equal(DemoPresentationSchema.safeParse(duplicate).success, false);
  const cells = structuredClone(acmeDemoPresentation);
  const table = cells.screens.find(screen => screen.table)!.table!;
  delete table.rows[0]!.cells[table.columns[0]!.key];
  assert.equal(DemoPresentationSchema.safeParse(cells).success, false);
});

test('controller navigation isolates canonical selection and returns detached snapshots', async () => {
  const { DemoController } = await import('../packages/engine/src/controller.js');
  const pack = await loadProductPack('packages/product-packs/acme/pack.json');
  const store = new SessionStore(); const controller = new DemoController(pack, store);
  const a = controller.create(), b = controller.create();
  const view = controller.execute(a.session.sessionId, { type: 'NAVIGATE', expectedRevision: 0, args: { screenId: 'sample-1001', recordId: 'SMP-1001' } });
  assert.equal(view.session.demoState.currentScreen, 'sample-1001');
  view.session.demoState.selectedRecordId = 'external-mutation';
  assert.equal(store.get(a.session.sessionId).session.demoState.selectedRecordId, 'SMP-1001');
  assert.equal(store.get(b.session.sessionId).session.demoState.currentScreen, pack.presentation.homeScreenId);
  store.end(a.session.sessionId);
  assert.throws(() => controller.execute(a.session.sessionId, { type: 'RETURN', expectedRevision: 1, args: {} }), /SESSION_ENDED/);
});
