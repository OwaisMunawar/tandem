import {
  createWsSynchronizer,
  type WebSocketTypes,
} from 'tinybase/synchronizers/synchronizer-ws-client/with-schemas';

import { type HouseholdStore, type PresenceStore } from '../../../core/store/types';

import { backoffDelay, DEFAULT_BACKOFF, type BackoffOptions } from '../lib/backoff';
import { PendingChanges } from '../lib/pendingChanges';
import { roomSocketUrl } from '../lib/roomUrl';
import {
  INITIAL_SYNC_STATE,
  isDisconnected,
  type SyncPhase,
  type SyncState,
} from '../lib/syncState';

/** The two calls the session makes on a synchronizer, whatever its schema. */
type ChannelSynchronizer = { startSync(): Promise<unknown>; destroy(): Promise<unknown> };

export type SyncSessionOptions = {
  serverUrl: string;
  roomId: string;
  /** The household document, persisted locally and on the server. */
  store: HouseholdStore;
  /** The ephemeral presence document, sharing the same socket. */
  presence: PresenceStore;
  /** Must open the socket with the `tinybase` subprotocol. */
  openSocket: (url: string) => WebSocketTypes;
  backoff?: BackoffOptions;
  random?: () => number;
  now?: () => number;
  /** Gives up on a connection attempt that neither opens nor fails. */
  connectTimeoutMs?: number;
  requestTimeoutSeconds?: number;
  onError?: (error: unknown) => void;
};

type Listener = (state: SyncState) => void;

export const DATA_CHANNEL = 'data';
export const PRESENCE_CHANNEL = 'presence';

/**
 * Owns the connection between a household and its sync server.
 *
 * TinyBase synchronizers do not survive a dropped socket, so each connection
 * attempt builds a fresh pair (household + presence) multiplexed over one
 * WebSocket, and a drop tears both down and schedules a retry with jittered
 * backoff. Nothing is queued here: the MergeableStore keeps every local
 * change with its timestamp, and the first sync after reconnecting exchanges
 * whatever the other side has not seen.
 */
export class SyncSession {
  private state: SyncState = INITIAL_SYNC_STATE;
  private readonly listeners = new Set<Listener>();
  private readonly pending = new PendingChanges();
  private synchronizers: ChannelSynchronizer[] = [];
  private socket: WebSocketTypes | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  /** Bumped on every pause/destroy so a slow in-flight attempt knows it is stale. */
  private generation = 0;
  private paused = false;
  private destroyed = false;
  private readonly removeStoreListener: () => void;

  constructor(private readonly options: SyncSessionOptions) {
    const store = options.store;
    const listenerId = store.addDidFinishTransactionListener(() => this.trackLocalChanges());
    this.removeStoreListener = () => store.delListener(listenerId);
  }

  getState(): SyncState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (this.destroyed || this.socket || this.retryTimer) return;
    if (this.paused) {
      this.update({ phase: 'paused' });
      return;
    }
    void this.connect();
  }

  /** User-initiated "work offline". Edits keep landing in the local store. */
  async pause(): Promise<void> {
    if (this.destroyed) return;
    this.paused = true;
    await this.disconnect();
    this.update({ phase: 'paused' });
  }

  resume(): void {
    if (this.destroyed || !this.paused) return;
    this.paused = false;
    this.attempt = 0;
    void this.connect();
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    this.removeStoreListener();
    await this.disconnect();
    this.listeners.clear();
  }

  private trackLocalChanges(): void {
    if (!isDisconnected(this.state.phase)) return;
    const [changedTables, changedValues] = this.options.store.getTransactionChanges();
    for (const [tableId, rows] of Object.entries(changedTables ?? {})) {
      for (const rowId of Object.keys(rows ?? {})) this.pending.add(tableId, rowId);
    }
    if (changedValues && Object.keys(changedValues).length > 0) this.pending.addValues();
    if (this.pending.count !== this.state.pending) this.update({ pending: this.pending.count });
  }

  private async connect(): Promise<void> {
    const generation = ++this.generation;
    const isStale = () => generation !== this.generation || this.destroyed;
    const { store, presence, requestTimeoutSeconds = 2 } = this.options;

    this.update({ phase: this.state.phase === 'offline' ? 'offline' : 'connecting' });
    const socket = this.options.openSocket(
      roomSocketUrl(this.options.serverUrl, this.options.roomId),
    );
    this.socket = socket;

    const timeout = new Promise<never>((_, reject) => {
      this.connectTimer = setTimeout(
        () => reject(new Error('Connection timed out')),
        this.options.connectTimeoutMs ?? 8_000,
      );
    });

    try {
      const synchronizers: ChannelSynchronizer[] = await Promise.race([
        Promise.all([
          createWsSynchronizer(store, socket, DATA_CHANNEL, requestTimeoutSeconds),
          createWsSynchronizer(presence, socket, PRESENCE_CHANNEL, requestTimeoutSeconds),
        ]),
        timeout,
      ]);
      this.clearConnectTimer();
      if (isStale()) {
        await Promise.allSettled(synchronizers.map((s) => s.destroy()));
        return;
      }
      this.synchronizers = synchronizers;
      socket.addEventListener('close', () => {
        if (!isStale()) void this.handleDrop();
      });

      this.update({ phase: 'syncing' });
      await Promise.all(synchronizers.map((s) => s.startSync()));
      if (isStale()) return;

      this.attempt = 0;
      this.pending.clear();
      this.update({ phase: 'synced', pending: 0, lastSyncedAt: this.now() });
    } catch (error) {
      this.clearConnectTimer();
      if (isStale()) return;
      this.options.onError?.(error);
      await this.handleDrop();
    }
  }

  private async handleDrop(): Promise<void> {
    await this.teardown();
    if (this.destroyed || this.paused) return;
    this.update({ phase: 'offline' });
    const delay = backoffDelay(
      this.attempt,
      this.options.backoff ?? DEFAULT_BACKOFF,
      this.options.random,
    );
    this.attempt += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.connect();
    }, delay);
  }

  private async disconnect(): Promise<void> {
    this.generation += 1;
    this.clearRetryTimer();
    this.clearConnectTimer();
    await this.teardown();
  }

  private async teardown(): Promise<void> {
    const synchronizers = this.synchronizers;
    const socket = this.socket;
    this.synchronizers = [];
    this.socket = null;
    await Promise.allSettled(synchronizers.map((s) => s.destroy()));
    try {
      socket?.close();
    } catch {
      // Closing an already-closed socket throws on some platforms.
    }
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private clearConnectTimer(): void {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;
  }

  private now(): number {
    return (this.options.now ?? Date.now)();
  }

  private update(patch: Partial<SyncState>): void {
    const next = { ...this.state, ...patch };
    if (
      next.phase === this.state.phase &&
      next.pending === this.state.pending &&
      next.lastSyncedAt === this.state.lastSyncedAt
    ) {
      return;
    }
    this.state = next;
    for (const listener of this.listeners) listener(next);
  }
}

export type { SyncPhase, SyncState };
