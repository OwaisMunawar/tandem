import { createMergeableStore, createStore } from 'tinybase/with-schemas';

import { deviceValuesSchema, presenceTablesSchema, tablesSchema, valuesSchema } from './schema';
import { type DeviceStore, type HouseholdStore, type PresenceStore } from './types';

/**
 * `getNow` exists for tests: CRDT timestamps decide merges, and the merge
 * suite needs to say exactly which edit happened later.
 */
export function createHouseholdStore(
  options: { uniqueId?: string; getNow?: () => number } = {},
): HouseholdStore {
  return createMergeableStore(options.uniqueId, options.getNow)
    .setTablesSchema(tablesSchema)
    .setValuesSchema(valuesSchema);
}

export function createPresenceStore(
  options: { uniqueId?: string; getNow?: () => number } = {},
): PresenceStore {
  return createMergeableStore(options.uniqueId, options.getNow).setTablesSchema(
    presenceTablesSchema,
  );
}

export function createDeviceStore(): DeviceStore {
  return createStore().setValuesSchema(deviceValuesSchema);
}
