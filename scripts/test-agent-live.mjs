// Real Claude HTTP rehearsal. Synthetic input only; no credentials in evidence.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createApp } from '../dist/apps/server/src/app.js';
import { loadProductPack } from '../dist/packages/product-packs/loader.js';
import { runtimeFor } from '../dist/packages/product-packs/runtimes.js';
import { ClaudeProvider } from '../dist/packages/agent/src/claude-provider.js';
import { DemoTurnProposalSchema } from '../dist/packages/contracts/src/turns.js';
const report = { status: 'NOT_RUN', date: new Date().toISOString(), provider: 'claude', model: process.env.GDE_CLAUDE_MODEL ?? 'claude-sonnet-4-6', turns: [] };
let server;
try {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) throw new Error('KEY_NOT_CONFIGURED');
  const pack = await loadProductPack('packages/product-packs/acme/pack.json');
  ({ server } = createApp({ pack, runtime: runtimeFor(pack), provider: new ClaudeProvider(process.env.ANTHROPIC_API_KEY.trim(), report.model) }));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const start = await (await fetch(base + '/api/sessions', { method: 'POST' })).json();
  const path = base + '/api/sessions/' + start.session.sessionId;
  let view = start;
  const turn = async (text, check, expected = 'completed') => {
    const response = await fetch(path + '/turns', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${start.accessToken}` }, body: JSON.stringify({ text, expectedRevision: view.session.revision }) });
    assert.equal(response.status, 200); view = await response.json(); const last = view.chat.turns.at(-1);
    report.turns.push({ text, status: last.status, provider: last.provider, errorCode: last.errorCode, providerHttpStatus: last.providerHttpStatus, proposal: last.proposal, actions: last.actions, response: last.response, revision: view.session.revision, screen: view.session.demoState.currentScreen, role: view.session.demoState.currentRole, paused: view.session.conversationState.paused, filters: view.session.demoState.filters, customerModel: view.session.customerModel, productChanges: last.productChanges, resultingContext: last.resultingContext });
    console.log(`${report.turns.length}. ${last.status}: ${text}`);
    assert.equal(last.status, expected, last.errorCode ?? 'Unexpected turn status');
    if (last.proposal) DemoTurnProposalSchema.parse(last.proposal);
    if (check) check(view, last);
  };
  const screen = id => view => assert.equal(view.session.demoState.currentScreen, id);
  await turn('Show me the first sample.', screen('sample-1001'));
  await turn('Show me QA.', screen('review-1001'));
  await turn('Go back.', screen('sample-1001'));
  await turn('Show me the exception.', screen('exception-1001'));
  await turn('Skip this.', screen('review-1001'));
  await turn('What happens next?');
  await turn('Can you switch roles?', (_view, last) => assert.equal(last.proposal.narrationIntent, 'clarify_role'));
  await turn('Switch to QA.', view => assert.equal(view.session.demoState.currentRole, 'qa'));
  await turn('I care more about external labs.', view => assert.ok(view.session.customerModel.entries.some(entry => entry.active && entry.value.toLowerCase().includes('external'))));
  await turn('We don’t work that way.', (_view, last) => assert.ok(last.proposal.narrationIntent.startsWith('clarify') || last.proposal.customerModelUpdates.length));
  await turn('Actually, internal labs are my focus.', view => assert.ok(view.session.customerModel.entries.some(entry => entry.active && entry.value.toLowerCase().includes('internal'))));
  await turn('Show the sample list.', screen('sample-list'));
  await turn('Filter the list to 1002.', view => {
    const query = view.session.demoState.filters['sample-list'];
    assert.ok(query, 'Expected an applied sample-list filter');
    const list = view.workspace.presentation.screens.find(screen => screen.id === 'sample-list');
    const matches = list.table.rows.filter(row => Object.values(row.cells).join(' ').toLowerCase().includes(query.toLowerCase()));
    assert.deepEqual(matches.map(row => row.id), ['SMP-1002'], 'Filter must select only the requested sample');
  });
  await turn('Reset the demo.');
  await turn('Show the first sample.', screen('sample-1001'));
  await turn('Start this sample’s test.', view => assert.equal(view.session.productState.records.find(record => record.id === 'TST-1001').state, 'in-progress'));
  await turn('Enter a measurement of 6.4 pH.');
  await turn('Submit the test.');
  await turn('Show the results.', screen('results-1001'));
  await turn('Assess the recorded measurement against the specification.', view => assert.equal(view.session.productState.records.find(record => record.id === 'EXC-1001').state, 'open'));
  await turn('Submit this sample for QA review.');
  await turn('Switch to QA.');
  await turn('Show QA review.', screen('review-1001'));
  await turn('Approve the review with rationale "Synthetic evidence reviewed".', (_view, last) => assert.equal(last.errorCode, 'ACTION_REJECTED'), 'rejected');
  await turn('Show the exception.', screen('exception-1001'));
  await turn('Resolve this exception with disposition "Synthetic exception evidence reviewed".');
  await turn('Show QA review.', screen('review-1001'));
  await turn('Approve the review with rationale "Synthetic evidence and disposition reviewed".', view => assert.equal(view.session.productState.records.find(record => record.id === 'SMP-1001').state, 'approved'));
  await turn('Does Acme integrate with SAP?', (view, last) => { assert.ok(last.response.includes('capture')); assert.ok(view.session.conversationState.outstandingQuestions.some(question => question.text === 'Does Acme integrate with SAP?')); });
  assert.deepEqual(await (await fetch(path, { headers: { Authorization: `Bearer ${start.accessToken}` } })).json(), view);
  await turn('Stop.', view => assert.equal(view.session.conversationState.paused, true));
  await turn('End the demo.', view => assert.equal(view.session.status, 'ended'));
  report.status = 'PASS'; report.claudeTurns = report.turns.filter(turn => turn.provider === 'claude').length;
} catch (error) {
  report.status = report.turns.some(turn => turn.errorCode === 'PROVIDER_UNAVAILABLE') ? 'BLOCKED' : 'FAIL';
  report.reason = error.message === 'KEY_NOT_CONFIGURED' ? 'API key not configured.' : report.turns.at(-1)?.errorCode ?? 'Live acceptance assertion failed; inspect saved evidence.';
  if (error?.code === 'ERR_ASSERTION') {
    report.assertion = { message: error.message.slice(0, 1500), actual: error.actual, expected: error.expected, operator: error.operator };
  }
  console.error(`Live validation ${report.status}: ${report.reason}`);
  if (report.assertion) console.error(report.assertion.message);
  process.exitCode = 1;
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await writeFile('docs/P4-live-evidence.json', JSON.stringify(report, null, 2) + '\n');
}
