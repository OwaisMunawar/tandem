import { createHouseholdStore, createPresenceStore } from '@/core/store/createStores';
import { type HouseholdStore, type PresenceStore } from '@/core/store/types';
import {
  createChoresRepository,
  type ChoresRepository,
} from '@/features/chores/data/choresRepository';
import {
  createHouseholdRepository,
  type HouseholdRepository,
} from '@/features/households/data/householdRepository';
import { createListsRepository, type ListsRepository } from '@/features/lists/data/listsRepository';
import { startPresenceBeacon, type PresenceBeacon } from '@/features/sync/data/presenceBeacon';
import { SyncSession } from '@/features/sync/data/syncSession';

import { type PersistedHandle, type Platform } from './ports';

export type Repositories = {
  household: HouseholdRepository;
  lists: ListsRepository;
  chores: ChoresRepository;
};

export type HouseholdRuntime = {
  roomId: string;
  serverUrl: string;
  deviceId: string;
  store: HouseholdStore;
  presence: PresenceStore;
  /** Null for a local-only household. */
  session: SyncSession | null;
  beacon: PresenceBeacon;
  repos: Repositories;
  close(): Promise<void>;
  erase(): Promise<void>;
};

export type RuntimeOptions = {
  roomId: string;
  serverUrl: string;
  deviceId: string;
  memberId: string;
  paused: boolean;
  platform: Platform;
};

/**
 * Opens one household: load from disk first, then connect. Loading before
 * syncing means the UI renders the last known state instantly, offline or
 * not, and the first sync only exchanges what changed since.
 */
export async function openHouseholdRuntime(options: RuntimeOptions): Promise<HouseholdRuntime> {
  const { platform } = options;
  const store = createHouseholdStore();
  const presence = createPresenceStore();
  const persisted: PersistedHandle = await platform.persistHousehold(store);

  const session = options.serverUrl
    ? new SyncSession({
        serverUrl: options.serverUrl,
        roomId: options.roomId,
        store,
        presence,
        openSocket: platform.openSocket,
        now: platform.now,
      })
    : null;
  if (session && options.paused) await session.pause();
  session?.start();

  const beacon = startPresenceBeacon(presence, options.deviceId, options.memberId, platform.now);
  const now = platform.now;

  let closed = false;
  const shutdown = async (handle: () => Promise<void>) => {
    if (closed) return;
    closed = true;
    beacon.stop();
    await session?.destroy();
    await handle();
  };

  return {
    roomId: options.roomId,
    serverUrl: options.serverUrl,
    deviceId: options.deviceId,
    store,
    presence,
    session,
    beacon,
    repos: {
      household: createHouseholdRepository(store, now),
      lists: createListsRepository(store, now),
      chores: createChoresRepository(store, now),
    },
    close: () => shutdown(() => persisted.close()),
    erase: () => shutdown(() => persisted.erase()),
  };
}
