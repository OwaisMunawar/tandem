import { getCalendars } from 'expo-localization';

import { persistToSqlite } from '@/core/store/nativePersistence';

import { type Platform } from './ports';

export const nativePlatform: Platform = {
  persistHousehold: (store) => persistToSqlite(store, 'household'),
  persistDevice: (store) => persistToSqlite(store, 'device'),
  // TinyBase multiplexes the household and presence channels over one socket
  // only when it is opened with its subprotocol.
  openSocket: (url) => new WebSocket(url, 'tinybase'),
  timeZone: () => getCalendars()[0]?.timeZone ?? 'UTC',
  now: () => Date.now(),
};
