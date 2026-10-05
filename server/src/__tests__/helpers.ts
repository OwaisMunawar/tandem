import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { WebSocket } from 'ws';

import { createHouseholdStore, createPresenceStore } from '../../../src/core/store/createStores';
import { createListsRepository } from '../../../src/features/lists/data/listsRepository';
import { SyncSession } from '../../../src/features/sync/data/syncSession';
import { type SyncPhase } from '../../../src/features/sync/lib/syncState';

export async function tempDir(): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const path = await mkdtemp(join(tmpdir(), 'tandem-'));
  return { path, cleanup: () => rm(path, { recursive: true, force: true }) };
}

export async function waitFor(
  predicate: () => boolean,
  timeoutMs = 5_000,
  label = 'condition',
): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error(`Timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/** A phone, as far as sync is concerned: the app's real store, repository and session. */
export function createClient(serverUrl: string, roomId: string, name: string) {
  const store = createHouseholdStore({ uniqueId: name });
  const presence = createPresenceStore({ uniqueId: `${name}-presence` });
  const session = new SyncSession({
    serverUrl,
    roomId,
    store,
    presence,
    openSocket: (url) => new WebSocket(url, 'tinybase'),
    backoff: { baseMs: 40, maxMs: 200 },
    connectTimeoutMs: 2_000,
  });
  return {
    name,
    store,
    presence,
    session,
    lists: createListsRepository(store),
    phase: (): SyncPhase => session.getState().phase,
    pending: () => session.getState().pending,
  };
}

export type Client = ReturnType<typeof createClient>;
