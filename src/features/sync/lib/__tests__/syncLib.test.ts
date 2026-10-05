import { backoffDelay } from '../backoff';
import { PendingChanges } from '../pendingChanges';
import { editorsOf, memberPresence, PRESENCE_TTL_MS } from '../presence';
import { httpBaseUrl, isRoomId, normaliseServerUrl, roomSocketUrl } from '../roomUrl';
import { describeSync, isDisconnected } from '../syncState';

describe('backoffDelay', () => {
  it('grows exponentially up to the cap, with full jitter', () => {
    const top = () => 0.999_999;
    expect(backoffDelay(0, { baseMs: 500, maxMs: 30_000 }, top)).toBe(500);
    expect(backoffDelay(3, { baseMs: 500, maxMs: 30_000 }, top)).toBe(4_000);
    expect(backoffDelay(20, { baseMs: 500, maxMs: 30_000 }, top)).toBe(30_000);
  });

  it('never retries instantly', () => {
    expect(backoffDelay(5, { baseMs: 500, maxMs: 30_000 }, () => 0)).toBe(250);
    expect(backoffDelay(-1, undefined, () => 0.5)).toBeGreaterThan(0);
  });
});

describe('describeSync', () => {
  it.each([
    [{ phase: 'local', pending: 0 }, 'On this phone', 'neutral'],
    [{ phase: 'synced', pending: 0 }, 'Synced', 'success'],
    [{ phase: 'syncing', pending: 0 }, 'Syncing', 'info'],
    [{ phase: 'connecting', pending: 2 }, 'Syncing', 'info'],
    [{ phase: 'offline', pending: 0 }, 'Offline', 'warning'],
    [{ phase: 'offline', pending: 1 }, 'Offline · 1 pending change', 'warning'],
    [{ phase: 'offline', pending: 3 }, 'Offline · 3 pending changes', 'warning'],
    [{ phase: 'paused', pending: 0 }, 'Sync paused', 'neutral'],
    [{ phase: 'paused', pending: 2 }, 'Paused · 2 changes', 'neutral'],
  ] as const)('%j', (state, label, tone) => {
    expect(describeSync({ ...state, lastSyncedAt: null })).toMatchObject({ label, tone });
  });

  it('knows which phases are disconnected', () => {
    expect(isDisconnected('offline')).toBe(true);
    expect(isDisconnected('paused')).toBe(true);
    expect(isDisconnected('synced')).toBe(false);
  });
});

describe('PendingChanges', () => {
  it('counts rows, not edits', () => {
    const pending = new PendingChanges();
    pending.add('items', 'a');
    pending.add('items', 'a');
    pending.add('items', 'b');
    pending.addValues();
    expect(pending.count).toBe(3);
    pending.clear();
    expect(pending.count).toBe(0);
  });
});

describe('presence', () => {
  const now = 1_000_000;
  const devices = {
    'phone-a': { memberId: 'ngozi', lastSeen: now - 1_000, editing: 'item-1' },
    'tablet-a': { memberId: 'ngozi', lastSeen: now - PRESENCE_TTL_MS - 1, editing: 'item-2' },
    'phone-b': { memberId: 'sam', lastSeen: now - PRESENCE_TTL_MS - 1, editing: '' },
    'phone-c': { memberId: 'linnea', lastSeen: now, editing: 'item-1' },
    unclaimed: { memberId: '', lastSeen: now, editing: '' },
  };

  it('merges devices per member and expires stale heartbeats', () => {
    const presence = memberPresence(devices, now);
    expect(presence.get('ngozi')).toEqual({ online: true, editing: ['item-1'] });
    expect(presence.get('sam')).toEqual({ online: false, editing: [] });
    expect(presence.has('')).toBe(false);
  });

  it('excludes this device from "who else is editing"', () => {
    expect(editorsOf('item-1', devices, now, 'phone-a').sort()).toEqual(['linnea']);
    expect(editorsOf('item-2', devices, now, 'phone-a')).toEqual([]);
  });
});

describe('room urls', () => {
  it('validates room ids', () => {
    expect(isRoomId('abcdefghijklmnopqrstuv')).toBe(true);
    expect(isRoomId('short')).toBe(false);
    expect(isRoomId('../../etc/passwd-aaaaaaaaaaaaaaaa')).toBe(false);
  });

  it('normalises server addresses', () => {
    expect(normaliseServerUrl('localhost:8043/')).toBe('ws://localhost:8043');
    expect(normaliseServerUrl('https://sync.example.com/tandem')).toBe(
      'wss://sync.example.com/tandem',
    );
    expect(normaliseServerUrl('WS://Example.com')).toBe('ws://Example.com');
    expect(normaliseServerUrl('   ')).toBeNull();
    expect(normaliseServerUrl('ftp://nope')).toBeNull();
  });

  it('derives socket and http urls', () => {
    expect(roomSocketUrl('ws://host:1/', 'room')).toBe('ws://host:1/room');
    expect(httpBaseUrl('wss://host/x/')).toBe('https://host/x');
    expect(httpBaseUrl('ws://host')).toBe('http://host');
  });
});
