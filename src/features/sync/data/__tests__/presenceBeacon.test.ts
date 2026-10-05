import { createPresenceStore } from '@/core/store/createStores';

import { HEARTBEAT_MS } from '../../lib/presence';
import { startPresenceBeacon } from '../presenceBeacon';

describe('presence beacon', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('heartbeats, reports editing, suspends and leaves', () => {
    let now = 1_000;
    const presence = createPresenceStore();
    const beacon = startPresenceBeacon(presence, 'phone-a', 'ngozi', () => now);
    expect(presence.getRow('devices', 'phone-a')).toEqual({
      memberId: 'ngozi',
      lastSeen: 1_000,
      editing: '',
    });

    now = 5_000;
    beacon.setEditing('item-1');
    beacon.setEditing('item-1');
    expect(presence.getRow('devices', 'phone-a')).toMatchObject({
      editing: 'item-1',
      lastSeen: 5_000,
    });

    now = 20_000;
    jest.advanceTimersByTime(HEARTBEAT_MS);
    expect(presence.getCell('devices', 'phone-a', 'lastSeen')).toBe(20_000);

    beacon.suspend();
    now = 40_000;
    jest.advanceTimersByTime(HEARTBEAT_MS * 2);
    expect(presence.getCell('devices', 'phone-a', 'lastSeen')).toBe(20_000);

    beacon.resume();
    beacon.resume();
    expect(presence.getCell('devices', 'phone-a', 'lastSeen')).toBe(40_000);

    beacon.setMember('linnea');
    expect(presence.getCell('devices', 'phone-a', 'memberId')).toBe('linnea');

    beacon.stop();
    expect(presence.hasRow('devices', 'phone-a')).toBe(false);
  });

  it('stays silent until the device knows who it is', () => {
    const presence = createPresenceStore();
    const beacon = startPresenceBeacon(presence, 'phone-b', '');
    expect(presence.hasRow('devices', 'phone-b')).toBe(false);
    beacon.setMember('sam');
    expect(presence.hasRow('devices', 'phone-b')).toBe(true);
    beacon.stop();
  });
});
