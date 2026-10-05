import { mkdir } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { type AddressInfo } from 'node:net';

import { type LanguageModel } from 'ai';
import { createMergeableStore } from 'tinybase';
import { createCustomPersister } from 'tinybase/persisters';
import { createFilePersister } from 'tinybase/persisters/persister-file';
import { createWsServer, type WsServer } from 'tinybase/synchronizers/synchronizer-ws-server';
import { WebSocketServer } from 'ws';

import { createHttpHandler } from './http';
import { createRateLimiter } from './rateLimit';
import { isPresencePath, isRoomSocketPath, roomFileFor } from './rooms';

export type TandemServerOptions = {
  port: number;
  host?: string;
  dataDir: string;
  /** A model instance, a gateway model id, or null to disable LLM quick add. */
  model: LanguageModel | null;
  quickAddRateLimit?: number;
  onError?: (error: unknown) => void;
};

function createMemoryPersister() {
  return createCustomPersister(
    createMergeableStore(),
    async () => undefined,
    async () => undefined,
    () => null,
    () => undefined,
    undefined,
    3, // Persists.StoreOrMergeableStore
  );
}

export type TandemServer = {
  url: string;
  httpUrl: string;
  wsServer: WsServer;
  close(): Promise<void>;
};

/**
 * One HTTP server carries both the sync sockets and the small JSON API.
 * Rooms are created lazily on first connection and persisted as one JSON
 * file each, containing the full CRDT document with its timestamps.
 */
export async function startTandemServer(options: TandemServerOptions): Promise<TandemServer> {
  await mkdir(options.dataDir, { recursive: true });
  const limiter = createRateLimiter(options.quickAddRateLimit ?? 20);

  const webSocketServer = new WebSocketServer({ noServer: true });
  const wsServer = createWsServer(
    webSocketServer,
    (pathId) => {
      const file = roomFileFor(pathId, options.dataDir);
      if (file) return createFilePersister(createMergeableStore(), file, options.onError);
      // Presence gets a server-side store that is never written anywhere.
      // Without one the server only relays, and a phone joining an empty
      // room waits out a request timeout before its first sync completes.
      if (isPresencePath(pathId)) return createMemoryPersister();
      return undefined;
    },
    options.onError,
  );

  const http: Server = createServer(
    createHttpHandler({
      model: options.model,
      allowQuickAdd: (key) => limiter.allow(key),
      stats: () => {
        const { paths, clients } = wsServer.getStats();
        return { rooms: Math.ceil(paths / 2), clients };
      },
    }),
  );

  http.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    if (!isRoomSocketPath(pathname)) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    webSocketServer.handleUpgrade(request, socket, head, (ws) => {
      webSocketServer.emit('connection', ws, request);
    });
  });

  await new Promise<void>((resolve) =>
    http.listen(options.port, options.host ?? '0.0.0.0', resolve),
  );
  const { port } = http.address() as AddressInfo;

  return {
    url: `ws://localhost:${port}`,
    httpUrl: `http://localhost:${port}`,
    wsServer,
    async close() {
      await wsServer.destroy();
      await new Promise<void>((resolve) => {
        http.closeAllConnections();
        http.close(() => resolve());
      });
    },
  };
}
