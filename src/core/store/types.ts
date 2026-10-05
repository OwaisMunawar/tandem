import { type MergeableStore, type Store } from 'tinybase/with-schemas';

import { type DeviceSchemas, type HouseholdSchemas, type PresenceSchemas } from './schema';

export type HouseholdStore = MergeableStore<HouseholdSchemas>;
export type PresenceStore = MergeableStore<PresenceSchemas>;
export type DeviceStore = Store<DeviceSchemas>;

export type TableName = keyof HouseholdSchemas[0];

/** A store's on-disk copy. */
export type PersistedHandle = {
  /** Stops saving and releases the persister; the data stays on disk. */
  close(): Promise<void>;
  /** Stops saving and deletes the persisted copy, used when leaving a household. */
  erase(): Promise<void>;
};
