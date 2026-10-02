import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(e => e.isDirectory() ? sourceFiles(join(dir, e.name)) : Promise.resolve(/\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [])));
  return nested.flat();
}

test('generic engine and contracts do not import Product Packs or product semantics', async () => {
  const files = [...await sourceFiles('packages/engine'), ...await sourceFiles('packages/contracts')];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /from\s+['"][^'"]*(product-packs|apps\/)/, file);
    assert.doesNotMatch(source, /Acme|Sample|Result|Exception|Veeva/, file);
  }
});

test('frontend does not import canonical session engine or hard-code Acme presentation', async () => {
  for (const file of await sourceFiles('apps/web/src')) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /from\s+['"][^'"]*(engine|product-packs|server)/, file);
    assert.doesNotMatch(source, /Acme Quality Cloud|SMP-100|TST-100|EXC-100|Clearwater Buffer/, file);
  }
});

test('environment secrets are ignored, with only the safe example permitted', () => {
  const result = spawnSync('git', ['check-ignore', '--no-index', '--stdin'], {
    input: '.env\n.env.local\n.env.production\n.env.example\n', encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), ['.env', '.env.local', '.env.production']);
});

test('Dependencies contain no provider, speech, database, or agent SDKs', async () => {
  const manifest = JSON.parse(await readFile('package.json', 'utf8'));
  assert.deepEqual(Object.keys(manifest.dependencies).sort(), ['react', 'react-dom', 'zod']);
});
