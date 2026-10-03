import { useEffect, useRef, useState } from 'react';
import type { SessionView } from '../../../packages/contracts/src/index.js';
import type { NavigationTarget } from '../../../packages/contracts/src/presentation.js';
import type { ProductPack } from '../../../packages/contracts/src/product-pack.js';
import type { Command } from '../../../packages/contracts/src/state.js';
import { DemoGuide } from './twin/guide.js';
import { ActionPanel, ContextControls, ParameterControls } from './twin/actions.js';
import { readPointer, savePointer, clearPointer } from './recovery.js';
import { api } from './api.js';
import { TextChat } from './twin/chat.js';
import { Navigation, ScreenView } from './twin/primitives.js';

export function App() {
  const [pack, setPack] = useState<ProductPack | null>(null);
  const [phase, setPhase] = useState('');
  const [view, setView] = useState<SessionView | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [health, loaded] = await Promise.all([api.health(), api.pack()]);
        if (!live) return;
        setPhase(health.phase); setPack(loaded);
        const pointer = readPointer(sessionStorage);
        if (pointer) {
          try { const restored = await api.read(pointer.sessionId, pointer.accessToken); if (live) { setToken(pointer.accessToken); setView(restored); } }
          catch { clearPointer(sessionStorage); if (live) setError('The previous session is unavailable. Start a new session.'); }
        }
      } catch { if (live) setError('Cannot connect to the demo server. Reload to retry.'); }
    })();
    return () => { live = false; };
  }, []);
  const demo = view?.workspace?.presentation ?? pack?.presentation;
  const state = view?.session.demoState;
  const screen = demo?.screens.find(item => item.id === state?.currentScreen && item.recordId === state.selectedRecordId);
  useEffect(() => { if (screen) heading.current?.focus(); }, [screen?.id]);
  async function operate(action: 'start' | 'end' | 'refresh' | Omit<Command, 'expectedRevision'>) {
    setBusy(true); setError(null);
    try {
      if (action === 'start') {
        const created = await api.start();
        setToken(created.accessToken); setView({ session: created.session, events: created.events, questions: created.questions, workspace: created.workspace, chat: created.chat });
        savePointer(sessionStorage, { sessionId: created.session.sessionId, accessToken: created.accessToken });
      } else if (view && token) {
        setView(typeof action === 'object'
          ? await api.command(view.session.sessionId, token, { ...action, expectedRevision: view.session.revision })
          : await api[action === 'end' ? 'end' : 'read'](view.session.sessionId, token));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The request could not be completed.');
      if (view && token) { try { setView(await api.read(view.session.sessionId, token)); } catch { /* Keep the last acknowledged view; do not invent state. */ } }
    } finally { setBusy(false); }
  }
  async function talk(text: string) {
    if (!view || !token) return;
    const regular = !['Stop', 'End the demo'].includes(text);
    if (regular) setChatBusy(true);
    setError(null);
    try {
      const next = await api.turn(view.session.sessionId, token, text, view.session.revision);
      setView(previous => !previous || next.session.revision >= previous.session.revision ? next : previous);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The text turn could not be completed.');
      try { const next = await api.read(view.session.sessionId, token); setView(previous => !previous || next.session.revision >= previous.session.revision ? next : previous); } catch { /* Preserve acknowledged state. */ }
    } finally { if (regular) setChatBusy(false); }
  }
  const active = view?.session.status === 'active';
  const disabled = !active || busy || chatBusy;
  const send = (type: Command['type'], args: Command['args']) => void operate({ type, args });
  const navigate = (target: NavigationTarget) => send('NAVIGATE', target);
  return <div className="app">
    <header className="topbar"><span className="brand">GDE <span>/</span> Demo Twin</span><span className="badge">Fictional product · {phase || 'Connecting…'}</span></header>
    <div className="layout"><aside className="sidebar"><p className="eyebrow">SYNTHETIC WORKSPACE</p><h2>{pack?.metadata.name ?? 'Connecting…'}</h2><p className="site-label">{demo?.fixtureLabel}</p>
      {demo && <Navigation items={demo.navigation} currentScreen={state?.currentScreen} onNavigate={navigate} disabled={disabled} />}
      <div className="sidebar-note"><strong>Deterministic demo</strong><p>Execute a fictional workflow. Each session has its own records and history.</p></div>
    </aside><main>
      <div className="session-toolbar"><span role="status" className="connection"><i aria-hidden="true" />{view ? active ? 'Session active' : 'Session ended' : pack ? 'Ready to explore' : 'Connecting…'}</span><div className="controls"><button className="secondary" disabled={!pack || busy || active} onClick={() => void operate('start')}>{view ? 'Start new session' : 'Start session'}</button><button className="secondary" disabled={!active || busy} onClick={() => void operate('end')}>End session</button></div></div>
      {pack && view && <ContextControls pack={pack} session={view.session} siteIds={view.workspace?.siteIds ?? pack.sites.map(site => site.id)} disabled={disabled} send={send} />}
      {error && <p role="alert" className="error">{error}</p>}
      {!view ? <section className="welcome panel"><p className="eyebrow">YOUR DEMO WORKSPACE</p><h1>{pack?.metadata.name ?? 'Demo workspace'}</h1><p>{pack?.metadata.description}</p><p>Run an isolated synthetic workflow from sample receipt to QA approval.</p><button disabled={!pack || busy} onClick={() => void operate('start')}>{busy ? 'Starting…' : 'Explore demo'}</button></section> : <>
        {!active && <aside className="notice notice-neutral"><strong>This session has ended</strong><p>Start a new session to explore from the beginning.</p></aside>}
        {demo && <nav className="walkthrough" aria-label="Guided walkthrough">{demo.walkthrough.map((item, index) => <button key={item.label} aria-current={item.target.screenId === state?.currentScreen ? 'step' : undefined} disabled={disabled} onClick={() => navigate(item.target)}><span>{index + 1}</span>{item.label}</button>)}</nav>}
        {screen ? <><div className="screen-heading"><div><p className="eyebrow">{demo?.fixtureLabel}</p><h1 ref={heading} tabIndex={-1}>{screen.title}</h1><p>{screen.subtitle}</p></div><span className={`badge tone-${screen.badge.tone}`}>{screen.badge.label}</span></div><ScreenView key={screen.id} screen={screen} onNavigate={navigate} disabled={disabled} filter={state?.filters[screen.id] ?? ''} onFilter={query => send('FILTER', { query })} highlights={state?.highlights ?? []} />
          <ActionPanel key={`${screen.id}:${view.session.revision}`} controls={view.workspace?.controls ?? []} disabled={disabled} send={send} />
        </> : <p role="alert">This workspace screen is unavailable.</p>}
      </>}
      {view && <TextChat view={view} busy={chatBusy} send={text => void talk(text)} />}
      {pack && <DemoGuide pack={pack} onNavigate={navigate} disabled={disabled} onLane={laneId => send('SET_LANE', { laneId })} currentRole={state?.currentRole ?? null} />}
      {pack && view && <ParameterControls key={view.session.revision} pack={pack} session={view.session} disabled={disabled} send={send} />}
      <details className="session-activity"><summary>Session activity · {view?.events.length ?? 0} events</summary><p>Live lifecycle, command and state events from this session.</p>{view && <><p className="session-id">Session <code>{view.session.sessionId}</code></p><ol>{view.events.map(event => <li key={event.eventId}><strong>{event.type}</strong><span>{event.commandType}</span><time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleTimeString()}</time>{event.errorCode && <code>{event.errorCode}</code>}</li>)}</ol><button className="secondary" disabled={busy} onClick={() => void operate('refresh')}>Refresh state</button></>}</details>
      <footer>All actions affect fictional session records only. No real laboratory, vendor or regulatory operation occurs.</footer>
    </main></div>
  </div>;
}
