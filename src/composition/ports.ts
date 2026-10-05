import { type WebSocketTypes } from 'tinybase/synchronizers/synchronizer-ws-client/with-schemas';

import { type DeviceStore, type HouseholdStore, type PersistedHandle } from '@/core/store/types';

export type { PersistedHandle };

/**
 * Everything the app needs from the device, behind interfaces so tests and
 * demo mode can run the real composition with in-memory parts.
 */
export type Platform = {
  persistHousehold(store: HouseholdStore): Promise<PersistedHandle>;
  persistDevice(store: DeviceStore): Promise<PersistedHandle>;
  openSocket(url: string): WebSocketTypes;
  timeZone(): string;
  now(): number;
};
