import { type Platform } from './ports';

/**
 * In-memory platform for tests and for demo builds without a server. The
 * composition is the same as on device; only storage and sockets differ.
 */
export function createMemoryPlatform(overrides: Partial<Platform> = {}): Platform {
  const noop = { close: async () => undefined, erase: async () => undefined };
  return {
    persistHousehold: async () => noop,
    persistDevice: async () => noop,
    openSocket: () => {
      throw new Error('The memory platform has no network.');
    },
    timeZone: () => 'Europe/London',
    now: () => Date.now(),
    ...overrides,
  };
}
