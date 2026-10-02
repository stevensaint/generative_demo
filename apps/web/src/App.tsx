import { useEffect, useRef, useState } from 'react';
import type { ProductPresentation, SessionView } from '../../../packages/contracts/src/index.js';
import type { DemoPresentation, NavigationTarget } from '../../../packages/contracts/src/presentation.js';
import { api } from './api.js';
import { Navigation, ScreenView } from './twin/primitives.js';

export function App() {
  const [presentation, setPresentation] = useState<ProductPresentation | null>(null);
  const [demo, setDemo] = useState<DemoPresentation | null>(null);
  const [view, setView] = useState<SessionView | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let live = true;
    Promise.all([api.health(), api.presentation(), api.demo()]).then(([, pack, blueprint]) => {
      if (live) { setPresentation(pack); setDemo(blueprint); }
    }).catch(() => { if (live) setError('Cannot connect to the demo server. Reload to retry.'); });
    return () => { live = false; };
  }, []);
  const state = view?.session.demoState;
  const screen = demo?.screens.find(item => item.id === state?.currentScreen && item.recordId === state.selectedRecordId);
  useEffect(() => { if (screen) heading.current?.focus(); }, [screen?.id]);

  async function operate(action: 'start' | 'end' | 'refresh' | NavigationTarget) {
    setBusy(true); setError(null);
    try {
      if (action === 'start') {
        const created = await api.start();
        setToken(created.accessToken);
        setView({ session: created.session, events: created.events });
      } else if (view && token) {
        setView(typeof action === 'object'
          ? await api.navigate(view.session.sessionId, token, action)
          : await api[action === 'end' ? 'end' : 'read'](view.session.sessionId, token));
      }
    } catch { setError('The request could not be completed. Try again.'); }
    finally { setBusy(false); }
  }
  const active = view?.session.status === 'active';
  const disabled = !active || busy;
  const navigate = (target: NavigationTarget) => void operate(target);
  return <div className="app">
    <header className="topbar"><span className="brand">GDE <span>/</span> Demo Twin</span><span className="badge">Fictional product · P1</span></header>
    <div className="layout">
      <aside className="sidebar"><p className="eyebrow">SYNTHETIC WORKSPACE</p><h2>{presentation?.name ?? 'Connecting…'}</h2><p className="site-label">{demo?.fixtureLabel}</p>
        {demo && <Navigation items={demo.navigation} currentScreen={state?.currentScreen} onNavigate={navigate} disabled={disabled} />}
        <div className="sidebar-note"><strong>Fixed demo fixtures</strong><p>Explore a prefilled story. Records remain unchanged as you navigate.</p></div>
      </aside>
      <main>
        <div className="session-toolbar"><span role="status" className="connection"><i aria-hidden="true" />{view ? active ? 'Session active' : 'Session ended' : demo ? 'Ready to explore' : 'Connecting…'}</span><div className="controls">
          <button className="secondary" disabled={!demo || busy || active} onClick={() => void operate('start')}>{view ? 'Start new session' : 'Start session'}</button>
          <button className="secondary" disabled={!active || busy} onClick={() => void operate('end')}>End session</button>
        </div></div>
        {error && <p role="alert" className="error">{error}</p>}
        {!view ? <section className="welcome panel"><p className="eyebrow">YOUR DEMO WORKSPACE</p><h1>{presentation?.name ?? 'Demo workspace'}</h1><p>{presentation?.description}</p><p>{demo?.fixtureDescription}</p><button disabled={!demo || busy} onClick={() => void operate('start')}>{busy ? 'Starting…' : 'Explore demo'}</button></section> : <>
          {!active && <aside className="notice notice-neutral"><strong>This session has ended</strong><p>Start a new session to explore from the beginning.</p></aside>}
          {demo && <nav className="walkthrough" aria-label="Guided walkthrough">{demo.walkthrough.map((item, index) => <button key={item.label} aria-current={item.target.screenId === state?.currentScreen ? 'step' : undefined} disabled={disabled} onClick={() => navigate(item.target)}><span>{index + 1}</span>{item.label}</button>)}</nav>}
          {screen ? <><div className="screen-heading"><div><p className="eyebrow">{demo?.fixtureLabel}</p><h1 ref={heading} tabIndex={-1}>{screen.title}</h1><p>{screen.subtitle}</p></div><span className={`badge tone-${screen.badge.tone}`}>{screen.badge.label}</span></div><ScreenView key={screen.id} screen={screen} onNavigate={navigate} disabled={disabled} /></> : <p role="alert">This workspace screen is unavailable.</p>}
        </>}
        <details className="session-activity"><summary>Session activity · {view?.events.length ?? 0} events</summary><p>Live session events are separate from the fixture history.</p>{view && <><p className="session-id">Session <code>{view.session.sessionId}</code></p><ol>{view.events.map(event => <li key={event.eventId}><strong>{event.type}</strong><time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleTimeString()}</time>{event.errorCode && <code>{event.errorCode}</code>}</li>)}</ol><button className="secondary" disabled={busy} onClick={() => void operate('refresh')}>Refresh events</button></>}</details>
        <footer>Fictional data for demonstration. No approval, release, or laboratory operation is performed.</footer>
      </main>
    </div>
  </div>;
}
