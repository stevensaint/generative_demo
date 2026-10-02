import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { z } from 'zod';
import { SessionStore, SessionError } from '../../../packages/engine/src/sessions.js';
import { acmePresentation } from '../../../packages/product-packs/acme/index.js';
import { acmeDemoPresentation } from '../../../packages/product-packs/acme/fixtures.js';
import { NavigationTargetSchema } from '../../../packages/contracts/src/presentation.js';
import type { ErrorCode } from '../../../packages/contracts/src/index.js';

const messages: Record<ErrorCode, string> = {
  INVALID_REQUEST: 'This request is not supported by the demo.',
  SESSION_ENDED: 'This session has ended. Start a new session to navigate.',
  SESSION_NOT_FOUND: 'Session not found.', UNAUTHORIZED: 'Session access denied.',
  NOT_FOUND: 'Endpoint not found.', INTERNAL_ERROR: 'The request could not be completed.',
};
const statuses: Record<ErrorCode, number> = {
  INVALID_REQUEST: 400, SESSION_NOT_FOUND: 404, SESSION_ENDED: 409, UNAUTHORIZED: 403, NOT_FOUND: 404, INTERNAL_ERROR: 500,
};
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function emptyBody(req: IncomingMessage) {
  let bytes = 0;
  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk);
  }
  if (bytes > 0) throw new SessionError('INVALID_REQUEST');
}

async function navigationBody(req: IncomingMessage) {
  if (req.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') throw new SessionError('INVALID_REQUEST');
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk);
    if (bytes <= 4096) chunks.push(Buffer.from(chunk));
  }
  if (bytes > 4096) throw new SessionError('INVALID_REQUEST');
  try { return NavigationTargetSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
  catch { throw new SessionError('INVALID_REQUEST'); }
}

export function createApp(options: { store?: SessionStore; staticDir?: string } = {}) {
  const store = options.store ?? new SessionStore();
  const accessTokens = new Map<string, string>();
  const server = createServer(async (req, res) => {
    let sessionId: string | null = null;
    try {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (path === '/api/health' && req.method === 'GET') return json(res, 200, { status: 'ok', phase: 'P1' });
      if (path === '/api/product-pack' && req.method === 'GET') return json(res, 200, acmePresentation);
      if (path === '/api/demo-presentation' && req.method === 'GET') return json(res, 200, acmeDemoPresentation);
      if (path === '/api/sessions' && req.method === 'POST') {
        await emptyBody(req);
        const view = store.create(acmePresentation.packId);
        const accessToken = randomUUID();
        accessTokens.set(view.session.sessionId, accessToken);
        const initial = store.navigate(view.session.sessionId, acmeDemoPresentation.homeScreenId, null);
        return json(res, 201, { ...initial, accessToken });
      }
      const match = /^\/api\/sessions\/([^/]+)(\/(?:end|navigation))?$/.exec(path);
      if (match) {
        const id = z.string().uuid().parse(match[1]);
        const token = accessTokens.get(id);
        if (!token) throw new SessionError('SESSION_NOT_FOUND');
        const supplied = Buffer.from(req.headers.authorization ?? '');
        const expected = Buffer.from(`Bearer ${token}`);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
          throw new SessionError('UNAUTHORIZED');
        }
        sessionId = id;
        if (!match[2] && req.method === 'GET') return json(res, 200, store.get(id));
        if (match[2] === '/navigation' && req.method === 'POST') {
          const target = await navigationBody(req);
          const screen = acmeDemoPresentation.screens.find(s => s.id === target.screenId);
          if (!screen || screen.recordId !== target.recordId) throw new SessionError('INVALID_REQUEST');
          return json(res, 200, store.navigate(id, target.screenId, target.recordId));
        }
        if (match[2] === '/end' && req.method === 'POST') {
          await emptyBody(req);
          return json(res, 200, store.end(id));
        }
        throw new SessionError('INVALID_REQUEST');
      }
      if (path.startsWith('/api/')) throw new SessionError('NOT_FOUND');
      if (options.staticDir && req.method === 'GET') {
        const root = resolve(options.staticDir);
        const file = resolve(root, `.${decodeURIComponent(path === '/' ? '/index.html' : path)}`);
        if (!file.startsWith(root + sep)) throw new SessionError('NOT_FOUND');
        let data: Buffer;
        try { data = await readFile(file); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new SessionError('NOT_FOUND');
          throw error;
        }
        res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
        return res.end(data);
      }
      throw new SessionError('NOT_FOUND');
    } catch (error) {
      const code: ErrorCode = error instanceof SessionError ? error.code : error instanceof z.ZodError || error instanceof URIError ? 'INVALID_REQUEST' : 'INTERNAL_ERROR';
      // No request bodies, credentials, stack traces, or customer data enter events.
      const event = store.recordError(sessionId, code);
      json(res, statuses[code], { error: { code, message: messages[code], eventId: event.eventId } });
    }
  });
  return { server, store };
}
