import { loadConfig } from '../config';
import { buildInstructions } from '../quickAdd';
import { createRateLimiter } from '../rateLimit';
import { isPresencePath, isRoomSocketPath, roomFileFor } from '../rooms';

const ROOM = 'AbCdEfGhIjKlMnOpQrStUv';

describe('rooms', () => {
  it('accepts room sockets only', () => {
    expect(isRoomSocketPath(`/${ROOM}`)).toBe(true);
    expect(isRoomSocketPath(`/${ROOM}/`)).toBe(true);
    expect(isRoomSocketPath('/short')).toBe(false);
    expect(isRoomSocketPath(`/${ROOM}/data`)).toBe(false);
    expect(isRoomSocketPath('/../../etc/passwd')).toBe(false);
  });

  it('persists the data channel only', () => {
    expect(roomFileFor(`${ROOM}/data`, '/srv')).toBe(`/srv/${ROOM}.json`);
    expect(roomFileFor(`${ROOM}/presence`, '/srv')).toBeNull();
    expect(roomFileFor('evil/../data', '/srv')).toBeNull();
    expect(isPresencePath(`${ROOM}/presence`)).toBe(true);
    expect(isPresencePath(`${ROOM}/data`)).toBe(false);
  });
});

describe('config', () => {
  it('has defaults and validates', () => {
    expect(loadConfig({})).toEqual({
      port: 8043,
      host: '0.0.0.0',
      dataDir: './data',
      quickAddModel: '',
      quickAddRateLimit: 20,
    });
    expect(loadConfig({ PORT: '9000', QUICK_ADD_MODEL: ' openai/gpt-5-mini ' })).toMatchObject({
      port: 9000,
      quickAddModel: 'openai/gpt-5-mini',
    });
    expect(() => loadConfig({ PORT: 'abc' })).toThrow();
  });
});

describe('rate limiter', () => {
  it('allows a burst per window per key', () => {
    let now = 0;
    const limiter = createRateLimiter(2, 1_000, () => now);
    expect([
      limiter.allow('a'),
      limiter.allow('a'),
      limiter.allow('a'),
      limiter.allow('b'),
    ]).toEqual([true, true, false, true]);
    now = 1_000;
    expect(limiter.allow('a')).toBe(true);
  });

  it('sweeps old windows when tracking many clients', () => {
    let now = 0;
    const limiter = createRateLimiter(1, 10, () => now);
    for (let i = 0; i <= 10_000; i += 1) limiter.allow(`k${i}`);
    now = 100;
    expect(limiter.allow('fresh')).toBe(true);
  });
});

describe('model instructions', () => {
  it('give the model today, the zone, the members and the rules', () => {
    const text = buildInstructions({
      text: 'x',
      today: '2026-10-09',
      now: '18:00',
      timeZone: 'Europe/Stockholm',
      members: [{ id: 'm1', name: 'Linnea' }],
      selfId: 'm1',
    });
    expect(text).toContain('Today is Friday 2026-10-09');
    expect(text).toContain('Europe/Stockholm');
    expect(text).toContain('Linnea (id: m1)');
    expect(text).toContain('"me" or "I" means them');
    expect(
      buildInstructions({
        text: 'x',
        today: '2026-10-09',
        now: '18:00',
        timeZone: 'UTC',
        members: [],
        selfId: null,
      }),
    ).toContain('- (none)');
  });
});
