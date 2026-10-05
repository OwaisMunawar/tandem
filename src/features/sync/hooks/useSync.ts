import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { useHousehold } from '@/composition/AppProvider';
import { useNow } from '@/core/hooks/useNow';
import { usePresenceTable } from '@/core/store/hooks';

import {
  editorsOf,
  memberPresence,
  type DeviceHeartbeat,
  type MemberPresence,
} from '../lib/presence';
import { type SyncState } from '../lib/syncState';

const LOCAL_STATE: SyncState = { phase: 'local', pending: 0, lastSyncedAt: null };

const noSubscription = () => () => undefined;

export function useSyncState(): SyncState {
  const { session } = useHousehold();
  const subscribe = useCallback(
    (onChange: () => void) => (session ? session.subscribe(onChange) : noSubscription()),
    [session],
  );
  // The session only replaces its state object on change, so this snapshot is stable.
  return useSyncExternalStore(subscribe, () => session?.getState() ?? LOCAL_STATE);
}

function useHeartbeats() {
  const { presence, deviceId } = useHousehold();
  const table = usePresenceTable('devices', presence);
  const now = useNow(5_000);
  const devices = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(table).map(([id, row]): [string, DeviceHeartbeat] => [
          id,
          { memberId: row.memberId ?? '', lastSeen: row.lastSeen ?? 0, editing: row.editing ?? '' },
        ]),
      ),
    [table],
  );
  return { devices, now, deviceId };
}

/** Other devices' presence, re-evaluated every few seconds so stale heartbeats expire. */
export function usePresence(): Map<string, MemberPresence> {
  const { devices, now, deviceId } = useHeartbeats();
  return useMemo(() => memberPresence(devices, now, deviceId), [devices, now, deviceId]);
}

export function useEditors(targetId: string): string[] {
  const { devices, now, deviceId } = useHeartbeats();
  return useMemo(
    () => editorsOf(targetId, devices, now, deviceId),
    [devices, now, deviceId, targetId],
  );
}

/** Announces that this device is editing `targetId` while the calling screen is mounted. */
export function useEditingPresence(targetId: string): void {
  const { beacon } = useHousehold();
  useEffect(() => {
    beacon.setEditing(targetId);
    return () => beacon.setEditing('');
  }, [beacon, targetId]);
}
