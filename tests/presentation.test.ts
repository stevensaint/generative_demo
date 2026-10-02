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

test('generic navigation changes canonical selection without modifying fixtures or another session', () => {
  const store = new SessionStore(); const a = store.create('abstract'); const b = store.create('abstract');
  const view = store.navigate(a.session.sessionId, 'opaque-screen', 'opaque-record');
  assert.equal(view.session.demoState.currentScreen, 'opaque-screen');
  view.session.demoState.selectedRecordId = 'external-mutation';
  assert.equal(store.get(a.session.sessionId).session.demoState.selectedRecordId, 'opaque-record');
  assert.equal(store.get(b.session.sessionId).session.demoState.currentScreen, 'shell');
  store.end(a.session.sessionId);
  assert.throws(() => store.navigate(a.session.sessionId, 'another', null), /SESSION_ENDED/);
});
