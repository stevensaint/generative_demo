import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductPack } from '../packages/product-packs/loader.js';
import { DemoGuide } from '../apps/web/src/twin/guide.js';
import { ScreenView } from '../apps/web/src/twin/primitives.js';
const pack = await loadProductPack('packages/product-packs/acme/pack.json');

test('generic React guide renders Pack lanes, bounds and approved answers without action controls', () => {
  const html = renderToStaticMarkup(<DemoGuide pack={pack} onNavigate={() => {}} disabled={false} />);
  for (const lane of pack.lanes) assert.ok(html.includes(`Explore ${lane.label}`));
  assert.match(html, /1–12/);
  assert.match(html, /default: mixed/);
  assert.match(html, /deterministic synthetic configuration/);
  assert.doesNotMatch(html, /<button[^>]*>Approve|<button[^>]*>Record measurement|<button[^>]*>Generate/);
  const disabled = renderToStaticMarkup(<DemoGuide pack={pack} onNavigate={() => {}} disabled />);
  assert.equal((disabled.match(/disabled=""/g) ?? []).length, 4);
});

test('Pack configuration changes rendered content and remains escaped React data', () => {
  const changed = structuredClone(pack);
  changed.lanes[0]!.label = 'Configured <script>alert(1)</script> path';
  const guide = renderToStaticMarkup(<DemoGuide pack={changed} onNavigate={() => {}} disabled={false} />);
  assert.match(guide, /Configured &lt;script&gt;/);
  assert.doesNotMatch(guide, /<script>/);
  const screen = changed.presentation.screens.find(screen => screen.id === 'work-queue')!;
  screen.sections[0]!.fields[0]!.value = 'Configured site context';
  const view = renderToStaticMarkup(<ScreenView screen={screen} onNavigate={() => {}} disabled={false} />);
  assert.match(view, /Configured site context/);
  assert.match(view, /Open SMP-1001/);
});
