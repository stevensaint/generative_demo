import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';

// Built-runtime acceptance proof: run outside the repository with only a JSON
// configuration change. Never print access tokens or session IDs.
const root = fileURLToPath(new URL('../', import.meta.url));
const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const dir = await mkdtemp(join(tmpdir(), 'gde-pack-runtime-'));
const path = join(dir, 'alternate.json');
const pack = JSON.parse(await readFile(join(root, 'packages/product-packs/acme/pack.json'), 'utf8'));
pack.metadata.name = 'Configured Fictional Demo';
pack.presentation.screens[0].title = 'Configured runtime queue';
await writeFile(path, JSON.stringify(pack));
const start = (stdio) => spawn(process.execPath, [join(root, 'dist/apps/server/src/main.js')], {
  cwd: dir, env: { ...process.env, PORT: String(port), GDE_PRODUCT_PACK_PATH: path }, stdio,
});
let child;
try {
  child = start(['ignore', 'pipe', 'pipe']);
  let diagnostics = '';
  child.stdout.on('data', chunk => { diagnostics += chunk; });
  child.stderr.on('data', chunk => { diagnostics += chunk; });
  const base = `http://127.0.0.1:${port}`;
  let health;
  for (let i = 0; i < 60; i++) {
    try { health = await (await fetch(base + '/api/health')).json(); break; }
    catch { await new Promise(resolve => setTimeout(resolve, 50)); }
  }
  assert.equal(health?.phase, 'P5', diagnostics);
  const metadata = await (await fetch(base + '/api/product-pack')).json();
  assert.equal(metadata.name, 'Configured Fictional Demo');
  const manifest = await (await fetch(base + '/api/product-pack/manifest')).json();
  assert.equal(manifest.presentation.screens[0].title, 'Configured runtime queue');
  assert.match(await (await fetch(base)).text(), /GDE/);
  const session = await (await fetch(base + '/api/sessions', { method: 'POST' })).json();
  const eventTypes = session.events.map(event => event.type);
  assert.deepEqual(eventTypes, ['SESSION_STARTED']);
  console.log(JSON.stringify({ status: 'PASS', health, externalWorkingDirectory: true,
    configuredMetadata: metadata.name, configuredQueue: manifest.presentation.screens[0].title,
    laneCount: manifest.lanes.length, sessionScreen: session.session.demoState.currentScreen,
    eventTypes, builtAssetsServed: true }, null, 2));
  child.kill('SIGTERM');
  await new Promise(resolve => child.once('exit', resolve));
  child = undefined;
  await writeFile(path, '{"invalid":true}');
  const invalid = start('ignore');
  const code = await new Promise(resolve => invalid.once('exit', resolve));
  assert.notEqual(code, 0);
  console.log(JSON.stringify({ invalidPackStartup: 'REJECTED', exitCode: code }));
} finally {
  if (child && child.exitCode === null) child.kill('SIGTERM');
  await rm(dir, { recursive: true, force: true });
}
