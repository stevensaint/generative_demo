import { randomUUID } from 'node:crypto';
import { EventSchema, SessionSchema, type Event, type ErrorCode, type Session, type SessionView } from '../../contracts/src/index.js';

export class SessionError extends Error {
  constructor(public readonly code: ErrorCode) { super(code); }
}

// Process-local P0 lifecycle store. Product semantics belong to Product Packs.
export class SessionStore {
  private readonly sessions = new Map<string, Session>();
  private readonly events = new Map<string, Event[]>();
  private readonly systemEvents: Event[] = [];

  create(productPackId: string): SessionView {
    const session = SessionSchema.parse({
      sessionId: randomUUID(), status: 'active', startedAt: new Date().toISOString(), endedAt: null,
      productPackId,
      demoState: { currentLane: null, currentRole: null, currentSite: null, currentScreen: 'shell' },
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

  recordError(sessionId: string | null, code: ErrorCode): Event {
    // Unknown IDs never create sessions or attach errors to someone else's log.
    return this.append(sessionId && this.sessions.has(sessionId) ? sessionId : null, 'ERROR_OCCURRED', code);
  }

  getSystemEvents(): Event[] { return structuredClone(this.systemEvents); }

  private append(sessionId: string | null, type: Event['type'], errorCode?: ErrorCode): Event {
    const log = sessionId === null ? this.systemEvents : this.events.get(sessionId)!;
    const event = EventSchema.parse({
      eventId: randomUUID(), sessionId, type, sequence: log.length + 1,
      timestamp: new Date().toISOString(), ...(errorCode ? { errorCode } : {}),
    });
    log.push(event);
    return structuredClone(event);
  }
}
