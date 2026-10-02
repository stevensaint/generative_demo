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

test('chat and turn inspection escape untrusted customer/model text and disable ended controls', async () => {
  const { TextChat } = await import('../apps/web/src/twin/chat.js');
  const { DemoController } = await import('../packages/engine/src/controller.js');
  const { SessionStore } = await import('../packages/engine/src/sessions.js');
  const { DemoTurnExecutor } = await import('../packages/engine/src/demo-turns.js');
  const { GDEAgent } = await import('../packages/agent/src/gde-agent.js');
  const { acmeRuntime } = await import('../packages/product-packs/acme/runtime.js');
  const controller = new DemoController(pack, new SessionStore(), acmeRuntime);
  const executor = new DemoTurnExecutor(controller, new GDEAgent({ name: 'test-provider', model: 'fixture-only', propose: async () => ({ understanding: { intent: 'navigate', summary: '<script>alert(1)</script>', confidence: 0.8 }, customerModelUpdates: [], requestedActions: [], narrationIntent: 'current_view', questionHandling: 'none', nextStep: 'listen' }) }));
  const id = controller.create().session.sessionId;
  const view = await executor.execute(id, { text: 'Hello <script>alert(2)</script>', expectedRevision: 0 });
  const html = renderToStaticMarkup(<TextChat view={view} busy={false} send={() => {}} />);
  assert.doesNotMatch(html, /<script>/); assert.match(html, /&lt;script&gt;/);
  const ended = await executor.execute(id, { text: 'End the demo', expectedRevision: 1 });
  const endedHtml = renderToStaticMarkup(<TextChat view={ended} busy={false} send={() => {}} />);
  assert.equal((endedHtml.match(/disabled=""/g) ?? []).length, 4);
});
