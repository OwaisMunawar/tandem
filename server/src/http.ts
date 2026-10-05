import { type IncomingMessage, type ServerResponse } from 'node:http';

import { type LanguageModel } from 'ai';

import { parseWithModel, QuickAddError } from './quickAdd';

const MAX_BODY_BYTES = 8 * 1024;

export type HttpDeps = {
  model: LanguageModel | null;
  allowQuickAdd: (clientKey: string) => boolean;
  stats: () => { rooms: number; clients: number };
};

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      // Keep draining rather than destroying the socket, so the client
      // still receives the 413 instead of a connection reset.
      if (size <= MAX_BODY_BYTES) chunks.push(chunk);
    });
    req.on('end', () => {
      if (size > MAX_BODY_BYTES) {
        reject(new QuickAddError(413, 'Request too large.'));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new QuickAddError(400, 'Body is not JSON.'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * The HTTP side of the server is deliberately tiny: a health check for
 * container orchestrators, a capability probe, and the optional LLM endpoint.
 * It never sees household data; that only flows over the sync socket.
 */
export function createHttpHandler(deps: HttpDeps) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/health') {
      send(res, 200, { ok: true, ...deps.stats() });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/v1/capabilities') {
      send(res, 200, { quickAddLlm: deps.model !== null });
      return;
    }

    if (url.pathname === '/v1/quick-add') {
      if (req.method !== 'POST') {
        send(res, 405, { error: 'Use POST.' });
        return;
      }
      if (!deps.model) {
        send(res, 404, { error: 'Quick add is not configured on this server.' });
        return;
      }
      if (!deps.allowQuickAdd(req.socket.remoteAddress ?? 'unknown')) {
        send(res, 429, { error: 'Too many requests.' });
        return;
      }
      try {
        send(res, 200, await parseWithModel(await readJson(req), deps.model));
      } catch (error) {
        const status = error instanceof QuickAddError ? error.status : 500;
        send(res, status, { error: error instanceof Error ? error.message : 'Failed.' });
      }
      return;
    }

    send(res, 404, { error: 'Not found.' });
  };
}
