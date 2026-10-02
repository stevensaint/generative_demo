import { useEffect, useState } from 'react';
import type { ProductPresentation, SessionView } from '../../../packages/contracts/src/index.js';
import { api } from './api.js';

export function App() {
  const [presentation, setPresentation] = useState<ProductPresentation | null>(null);
  const [view, setView] = useState<SessionView | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([api.health(), api.presentation()]).then(([, pack]) => {
      if (live) { setPresentation(pack); setConnected(true); }
    }).catch(() => { if (live) setError('Cannot connect to the demo server. Reload to retry.'); });
    return () => { live = false; };
  }, []);

  async function operate(action: 'start' | 'end' | 'refresh') {
    setBusy(true); setError(null);
    try {
      if (action === 'start') {
        const created = await api.start();
        setToken(created.accessToken);
        setView({ session: created.session, events: created.events });
      } else if (view && token) {
        setView(await api[action === 'end' ? 'end' : 'read'](view.session.sessionId, token));
      }
    } catch { setError('The request could not be completed. Try again.'); }
    finally { setBusy(false); }
  }

  const active = view?.session.status === 'active';
  return <div className="app">
    <header><span className="brand">GDE <span>/</span> Demo Twin</span><span className="badge">Fictional product · P0</span></header>
    <main>
      <p className="eyebrow">SYNTHETIC PRODUCT TWIN</p>
      <h1>{presentation?.name ?? 'Demo foundation'}</h1>
      <p className="intro">{presentation?.description ?? 'Connecting to the demo server…'}</p>
      <section className="workspace" aria-label="Demo Twin shell">
        <div className="workspace-heading"><h2>Demo workspace</h2><span className={connected ? 'connected' : ''}>{connected ? 'Backend connected' : 'Connecting…'}</span></div>
        <div className="empty"><div className="shell-icon" aria-hidden="true">◇</div><h3>Your demo starts here</h3><p>This foundation contains an empty shell. Product records and workflows arrive in later phases.</p></div>
        <div className="controls">
          <button disabled={!connected || busy || active} onClick={() => void operate('start')}>{busy && !active ? 'Starting…' : view ? 'Start new session' : 'Start session'}</button>
          <button className="secondary" disabled={!active || busy} onClick={() => void operate('end')}>End session</button>
          <button className="secondary" disabled={!view || busy} onClick={() => void operate('refresh')}>Refresh events</button>
        </div>
        {error && <p role="alert" className="error">{error}</p>}
      </section>
      <section className="session" aria-label="Session activity">
        <div className="workspace-heading"><h2>Session activity</h2><span role="status">{view ? view.session.status === 'active' ? 'Active' : 'Ended' : 'No session'}</span></div>
        {view ? <><p className="session-id">Session <code>{view.session.sessionId}</code></p><ol>{view.events.map(event => <li key={event.eventId}><span>{event.type}</span><time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleTimeString()}</time>{event.errorCode && <code>{event.errorCode}</code>}</li>)}</ol></> : <p>Start a session to see its lifecycle events.</p>}
      </section>
      <footer>Acme is fictional. This demo does not represent a real vendor’s product or establish enterprise readiness.</footer>
    </main>
  </div>;
}
