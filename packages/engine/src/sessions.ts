import { randomUUID } from 'node:crypto';
import { EventSchema, SessionSchema, type Event, type ErrorCode, type Session, type SessionView, SnapshotSchema } from '../../contracts/src/index.js';

export class SessionError extends Error {
  constructor(public readonly code: ErrorCode) { super(code); }
}

// Process-local canonical state and event store. Product semantics belong to Packs.
export class SessionStore {
  private readonly sessions = new Map<string, Session>();
  private readonly events = new Map<string, Event[]>();
  private readonly systemEvents: Event[] = [];

  create(productPackId: string, initial?: Pick<Session, 'productState' | 'demoState' | 'productPackVersion'>): SessionView {
    const session = SessionSchema.parse({
      sessionId: randomUUID(), status: 'active', startedAt: new Date().toISOString(), endedAt: null,
      productPackId, productPackVersion: initial?.productPackVersion ?? '0.0.0', revision: 0,
      productState: initial?.productState ?? { records: [] }, customerModel: {}, conversationState: { sequence: 0 },
      demoState: initial?.demoState ?? { currentLane: null, currentRole: null, currentSite: null, currentScreen: 'shell', selectedRecordId: null, history: [], filters: {}, highlights: [], parameters: {} },
    });
    this.sessions.set(session.sessionId, session);
    this.events.set(session.sessionId, []);
    this.append(session.sessionId, 'SESSION_STARTED');
    return this.get(session.sessionId);
  }

  get(sessionId: string): SessionView {
    const session = this.sessions.get(sessionId);
    if (!session) throw new SessionError('SESSION_NOT_FOUND');
    // Callers cannot mutate canonical state or another session's event history.
    return structuredClone({ session, events: this.events.get(sessionId)! });
  }

  end(sessionId: string): SessionView {
    const session = this.sessions.get(sessionId);
    if (!session) throw new SessionError('SESSION_NOT_FOUND');
    if (session.status === 'active') {
      session.status = 'ended';
      session.endedAt = new Date().toISOString();
      this.append(sessionId, 'SESSION_ENDED');
    }
    return this.get(sessionId);
  }

  commit(sessionId: string, expectedRevision: number, proposed: Session): SessionView {
    const current = this.get(sessionId).session;
    if (current.status !== 'active') throw new SessionError('SESSION_ENDED');
    if (current.revision !== expectedRevision) throw new SessionError('REVISION_CONFLICT');
    // Operational identity/lifecycle cannot be supplied by a command or Pack handler.
    const next = SessionSchema.parse({ ...current, productState: proposed.productState,
      demoState: proposed.demoState, revision: current.revision + 1 });
    this.sessions.set(sessionId, next);
    return this.get(sessionId);
  }

  commandEvent(sessionId: string, type: Event['type'], metadata: Pick<Event, 'commandId' | 'commandType' | 'recordId' | 'revision'>, errorCode?: ErrorCode): Event {
    return this.append(sessionId, type, errorCode, metadata);
  }

  snapshot(sessionId: string) {
    const view = this.get(sessionId);
    return SnapshotSchema.parse({ formatVersion: '1.0', session: view.session,
      lastEventSequence: view.events.length, capturedAt: view.events.at(-1)!.timestamp });
  }

  recordError(sessionId: string | null, code: ErrorCode): Event {
    // Unknown IDs never create sessions or attach errors to someone else's log.
    return this.append(sessionId && this.sessions.has(sessionId) ? sessionId : null, 'ERROR_OCCURRED', code);
  }

  getSystemEvents(): Event[] { return structuredClone(this.systemEvents); }

  private append(sessionId: string | null, type: Event['type'], errorCode?: ErrorCode, metadata: Partial<Event> = {}): Event {
    const log = sessionId === null ? this.systemEvents : this.events.get(sessionId)!;
    const event = EventSchema.parse({
      ...metadata, eventId: randomUUID(), sessionId, type, sequence: log.length + 1,
      timestamp: new Date().toISOString(), ...(errorCode ? { errorCode } : {}),
    });
    log.push(event);
    return structuredClone(event);
  }
}
