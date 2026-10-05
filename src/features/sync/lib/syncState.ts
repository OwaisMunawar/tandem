/**
 * `local` households have no server at all. `paused` is the user's choice,
 * `offline` is the network's. Both keep counting pending changes.
 */
export type SyncPhase = 'local' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'paused';

export type SyncState = {
  phase: SyncPhase;
  pending: number;
  lastSyncedAt: number | null;
};

export const INITIAL_SYNC_STATE: SyncState = {
  phase: 'connecting',
  pending: 0,
  lastSyncedAt: null,
};

export type SyncBadge = {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  /** A subset of the UI icon names, kept here so this module stays UI-free. */
  icon: 'synced' | 'syncing' | 'offline' | 'pause';
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function describeSync(state: SyncState): SyncBadge {
  switch (state.phase) {
    case 'local':
      return { label: 'On this phone', tone: 'neutral', icon: 'offline' };
    case 'synced':
      return { label: 'Synced', tone: 'success', icon: 'synced' };
    case 'connecting':
    case 'syncing':
      return { label: 'Syncing', tone: 'info', icon: 'syncing' };
    case 'paused':
      return {
        label: state.pending > 0 ? `Paused · ${plural(state.pending, 'change')}` : 'Sync paused',
        tone: 'neutral',
        icon: 'pause',
      };
    case 'offline':
      return {
        label:
          state.pending > 0 ? `Offline · ${plural(state.pending, 'pending change')}` : 'Offline',
        tone: 'warning',
        icon: 'offline',
      };
  }
}

/** Phases in which a local edit has not reached the server yet. */
export function isDisconnected(phase: SyncPhase): boolean {
  return phase === 'offline' || phase === 'paused' || phase === 'connecting';
}
