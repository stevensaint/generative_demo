import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { z } from 'zod';
import { SessionStore, SessionError } from '../../../packages/engine/src/sessions.js';
import { ProductPackSchema, type ProductPack } from '../../../packages/contracts/src/product-pack.js';
import { NavigationTargetSchema } from '../../../packages/contracts/src/presentation.js';
import { DemoController } from '../../../packages/engine/src/controller.js';
import type { PackRuntime } from '../../../packages/contracts/src/runtime.js';
import type { ErrorCode } from '../../../packages/contracts/src/index.js';
import type { ModelProvider } from '../../../packages/agent/src/model-provider.js';
import { GDEAgent } from '../../../packages/agent/src/gde-agent.js';
import { DemoTurnExecutor } from '../../../packages/engine/src/demo-turns.js';

const messages: Record<ErrorCode, string> = {
  CAPABILITY_NOT_AVAILABLE: 'That action is not available in this demo.',
  MODEL_OUTPUT_INVALID: 'The response could not be interpreted safely.', PROVIDER_UNAVAILABLE: 'Text chat is unavailable. Use the demo controls or try again later.',
  TURN_BUSY: 'A text turn is already running. Stop it or wait for the response.', TURN_CANCELLED: 'That turn was stopped.',
  ACTION_REJECTED: 'Complete the required role, site, workflow state, and evidence before this action.',
  REVISION_CONFLICT: 'This session changed. Refresh its state and try again.',
  INVALID_REQUEST: 'This request is not supported by the demo.',
  SESSION_ENDED: 'This session has ended. Start a new session to navigate.',
  SESSION_NOT_FOUND: 'Session not found.', UNAUTHORIZED: 'Session access denied.',
  NOT_FOUND: 'Endpoint not found.', INTERNAL_ERROR: 'The request could not be completed.',
};
const statuses: Record<ErrorCode, number> = {
  CAPABILITY_NOT_AVAILABLE: 409, MODEL_OUTPUT_INVALID: 502, PROVIDER_UNAVAILABLE: 503, TURN_BUSY: 409, TURN_CANCELLED: 409,
  ACTION_REJECTED: 409, REVISION_CONFLICT: 409, INVALID_REQUEST: 400, SESSION_NOT_FOUND: 404, SESSION_ENDED: 409, UNAUTHORIZED: 403, NOT_FOUND: 404, INTERNAL_ERROR: 500,
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

async function jsonBody(req: IncomingMessage) {
  if (req.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') throw new SessionError('INVALID_REQUEST');
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk);
    if (bytes <= 4096) chunks.push(Buffer.from(chunk));
  }
  if (bytes > 4096) throw new SessionError('INVALID_REQUEST');
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; }
  catch { throw new SessionError('INVALID_REQUEST'); }
}

export function createApp(options: { pack: ProductPack; runtime?: PackRuntime; store?: SessionStore; staticDir?: string; provider?: ModelProvider }) {
  const store = options.store ?? new SessionStore();
  const pack = ProductPackSchema.parse(options.pack);
  const { metadata: presentation, presentation: demoPresentation } = pack;
  const controller = new DemoController(pack, store, options.runtime);
  const turns = new DemoTurnExecutor(controller, options.provider ? new GDEAgent(options.provider) : undefined);
  const accessTokens = new Map<string, string>();
  const server = createServer(async (req, res) => {
    let sessionId: string | null = null;
    try {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (path === '/api/health' && req.method === 'GET') return json(res, 200, { status: 'ok', phase: 'P4' });
      if (path === '/api/product-pack/manifest' && req.method === 'GET') return json(res, 200, pack);
      if (path === '/api/product-pack' && req.method === 'GET') return json(res, 200, presentation);
      if (path === '/api/demo-presentation' && req.method === 'GET') return json(res, 200, demoPresentation);
      if (path === '/api/sessions' && req.method === 'POST') {
        await emptyBody(req);
        const view = controller.create();
        const accessToken = randomUUID();
        accessTokens.set(view.session.sessionId, accessToken);
        return json(res, 201, { ...turns.view(view.session.sessionId), accessToken });
      }
      const match = /^\/api\/sessions\/([^/]+)(\/(?:end|navigation|commands|snapshot|turns))?$/.exec(path);
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
        if (!match[2] && req.method === 'GET') return json(res, 200, turns.view(id));
        if (match[2] === '/turns' && req.method === 'POST') return json(res, 200, await turns.execute(id, await jsonBody(req)));
        if (match[2] === '/navigation' && req.method === 'POST') {
          const target = NavigationTargetSchema.parse(await jsonBody(req));
          controller.execute(id, { type: 'NAVIGATE', expectedRevision: store.get(id).session.revision, args: target });
          return json(res, 200, turns.view(id));
        }
        if (match[2] === '/commands' && req.method === 'POST') { controller.execute(id, await jsonBody(req)); return json(res, 200, turns.view(id)); }
        if (match[2] === '/snapshot' && req.method === 'GET') return json(res, 200, store.snapshot(id));
        if (match[2] === '/end' && req.method === 'POST') {
          await emptyBody(req);
          turns.cancel(id);
          store.end(id);
          return json(res, 200, turns.view(id));
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
  return { server, store, controller, turns };
}
