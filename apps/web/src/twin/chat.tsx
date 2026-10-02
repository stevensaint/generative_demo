import { useState } from 'react';
import type { SessionView } from '../../../../packages/contracts/src/index.js';
export function TextChat({ view, busy, send }: { view: SessionView; busy: boolean; send: (text: string) => void }) {
  const [text, setText] = useState('');
  const active = view.session.status === 'active', available = !!view.chat?.available;
  return <section className="panel text-chat" aria-label="Text demo conversation"><div className="chat-title"><h2>Explore in your words</h2><span className="badge">{view.session.conversationState.paused ? 'Paused' : 'Text demo'}</span></div>
    <p>Try “Show me QA”, “Go back”, or tell me what matters to you.</p>
    {!available && <p role="status">Text chat is unavailable. You can still explore with the demo controls.</p>}
    <ol className="chat-messages" aria-label="Demo conversation">{view.chat?.turns.map(turn => <li key={turn.turnId}><p className="customer-message"><strong>You</strong> {turn.customerText}</p><p className="demo-message"><strong>Demo guide</strong> {turn.response}</p></li>)}</ol>
    <div role="status" aria-live="polite">{busy ? 'Listening… You can pause or end the demo.' : ''}</div>
    <form onSubmit={event => { event.preventDefault(); if (text.trim()) { send(text.trim()); setText(''); } }}><label>Message to demo guide<textarea value={text} onChange={event => setText(event.target.value)} required maxLength={2000} disabled={!active || !available} rows={2} /></label><button disabled={!active || !available || busy || !text.trim()}>Send message</button></form>
    <div className="controls"><button className="secondary" disabled={!active} onClick={() => send('Stop')}>Pause demo</button><button className="secondary" disabled={!active} onClick={() => send('End the demo')}>End demo</button></div>
    <details className="turn-inspection"><summary>Conversation details</summary><p>Product questions are captured for follow-up. This phase supports demo control and bounded explanations.</p>
      <h3>Captured questions</h3><ul>{view.session.conversationState.outstandingQuestions.map(question => <li key={question.id}>{question.text} · {question.status}</li>)}</ul>
      <h3>What you’ve shared</h3><ul>{view.session.customerModel.entries.filter(entry => entry.active).map(entry => <li key={entry.id}><strong>{entry.field}</strong>: {entry.value} · {entry.status} ({entry.confidence})<blockquote>{entry.provenance.quote}</blockquote><small>Source: customer text, turn {entry.provenance.sequence}{entry.supersedesId ? ' · supersedes earlier understanding' : ''}</small></li>)}</ul>
      <h3>Demo turns</h3>{view.chat?.turns.map(turn => <details key={turn.turnId}><summary>Turn {turn.sequence} · {turn.status}</summary><p>{turn.proposal?.understanding.summary ?? 'No valid interpretation.'}</p><p>Narration intent: {turn.proposal?.narrationIntent ?? 'none'} · Revision {turn.beforeRevision} → {turn.afterRevision}</p><ul>{turn.actions.map((action, index) => <li key={index}>{action.type}: {action.status}{action.code ? ` (${action.code})` : ''}</li>)}</ul><p>Resulting view: {turn.resultingContext.screen} · {turn.resultingContext.lifecycle}</p><details><summary>Structured proposal and effects</summary><pre>{JSON.stringify({ proposal: turn.proposal, customerChanges: turn.customerChanges, productChanges: turn.productChanges, resultingContext: turn.resultingContext }, null, 2)}</pre></details>{turn.errorCode && <p>{turn.errorCode}</p>}</details>)}
    </details>
  </section>;
}
