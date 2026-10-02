import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readPointer, savePointer, clearPointer } from '../apps/web/src/recovery.js';

test('refresh pointer stores only validated credentials; corrupt or injected snapshots are discarded', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const pointer = { sessionId: randomUUID(), accessToken: randomUUID() };
  assert.equal(readPointer(storage), null);
  savePointer(storage, pointer); assert.deepEqual(readPointer(storage), pointer);
  assert.equal(values.size, 1);
  for (const raw of ['{', JSON.stringify({ ...pointer, productState: { records: [] } }), JSON.stringify({ sessionId: 'bad', accessToken: 'bad' })]) {
    values.set('gde.session.v1', raw); assert.equal(readPointer(storage), null); assert.equal(values.size, 0);
  }
  savePointer(storage, pointer); clearPointer(storage); assert.equal(readPointer(storage), null);
});
