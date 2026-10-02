import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionStore } from '../packages/engine/src/sessions.js';
import { EventSchema, SessionViewSchema } from '../packages/contracts/src/index.js';

test('session creation produces unique IDs and isolated canonical state and logs', () => {
  const store = new SessionStore();
  const a = store.create('fictional-pack');
  const b = store.create('fictional-pack');
  assert.notEqual(a.session.sessionId, b.session.sessionId);
  assert.deepEqual(store.get(a.session.sessionId).session.demoState, { currentLane: null, currentRole: null, currentSite: null, currentScreen: 'shell', selectedRecordId: null });
  a.session.demoState.currentSite = 'mutated';
  a.events.length = 0;
  assert.equal(store.get(a.session.sessionId).session.demoState.currentSite, null);
  assert.equal(store.get(b.session.sessionId).session.demoState.currentSite, null);
  assert.equal(store.get(a.session.sessionId).events.length, 1);
  assert.deepEqual(b.events.map(e => e.type), ['SESSION_STARTED']);
});

test('ending is idempotent and does not end or append events in another session', () => {
  const store = new SessionStore();
  const a = store.create('pack');
  const b = store.create('pack');
  const ended = store.end(a.session.sessionId);
  assert.equal(ended.session.status, 'ended');
  assert.ok(ended.session.endedAt);
  assert.deepEqual(store.end(a.session.sessionId), ended);
  assert.deepEqual(ended.events.map(e => [e.type, e.sequence]), [['SESSION_STARTED', 1], ['SESSION_ENDED', 2]]);
  assert.equal(store.get(b.session.sessionId).session.status, 'active');
  assert.equal(store.get(b.session.sessionId).events.length, 1);
  SessionViewSchema.parse(ended);
});

test('errors are session-scoped; unknown sessions remain unknown', () => {
  const store = new SessionStore();
  const a = store.create('pack');
  const b = store.create('pack');
  const error = store.recordError(a.session.sessionId, 'INVALID_REQUEST');
  EventSchema.parse(error);
  assert.equal(error.type, 'ERROR_OCCURRED');
  assert.equal(error.sequence, 2);
  error.errorCode = 'INTERNAL_ERROR';
  assert.equal(store.get(a.session.sessionId).events[1]?.errorCode, 'INVALID_REQUEST');
  assert.equal(store.get(b.session.sessionId).events.length, 1);
  const unknown = store.recordError('unknown', 'SESSION_NOT_FOUND');
  assert.equal(unknown.sessionId, null);
  assert.throws(() => store.get('unknown'), /SESSION_NOT_FOUND/);
  const system = store.getSystemEvents(); system.length = 0;
  assert.equal(store.getSystemEvents().length, 1);
});

test('separate application stores have no shared state', () => {
  const a = new SessionStore(); const b = new SessionStore();
  assert.throws(() => b.get(a.create('pack').session.sessionId), /SESSION_NOT_FOUND/);
});
