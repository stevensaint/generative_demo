import { IncomingMessage, ServerResponse, type Server } from 'node:http';
import { Duplex } from 'node:stream';
import type { Socket } from 'node:net';

// Exercise Node's real HTTP request/response objects without opening a port.
// The separate test:http command runs the same assertions over actual TCP.
export function memoryFetch(server: Server): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const chunks: Buffer[] = [];
    const socket = new Duplex({ read() {}, write(chunk, _encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
    const req = new IncomingMessage(socket as Socket);
    req.complete = true;
    req.method = init?.method ?? 'GET'; req.url = url.pathname + url.search;
    req.headers = Object.fromEntries(new Headers(init?.headers).entries());
    const res = new ServerResponse(req);
    res.useChunkedEncodingByDefault = false; res.shouldKeepAlive = false;
    res.assignSocket(socket as Socket);
    const done = new Promise<Response>((resolve, reject) => {
      res.on('error', reject);
      res.on('finish', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        const separator = raw.indexOf('\r\n\r\n');
        const lines = raw.slice(0, separator).split('\r\n');
        const headers = new Headers();
        for (const line of lines.slice(1)) {
          const colon = line.indexOf(':');
          if (colon > 0) headers.set(line.slice(0, colon), line.slice(colon + 1).trim());
        }
        socket.destroy();
        resolve(new Response(raw.slice(separator + 4), { status: res.statusCode, headers }));
      });
    });
    req.push(init?.body ? String(init.body) : null);
    if (init?.body) req.push(null);
    server.emit('request', req, res);
    return done;
  }) as typeof fetch;
}
