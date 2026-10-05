import { createHouseholdStore } from '@/core/store/createStores';
import { type HouseholdStore } from '@/core/store/types';
import { createChoresRepository } from '@/features/chores/data/choresRepository';
import { createHouseholdRepository } from '@/features/households/data/householdRepository';
import { createListsRepository } from '@/features/lists/data/listsRepository';

/**
 * A simulated phone: its own MergeableStore and its own clock. Merges are
 * decided by hybrid logical clock timestamps, so tests move each phone's
 * clock explicitly to say which edit happened later.
 */
export function createDevice(name: string, startAt = Date.parse('2026-10-05T09:00:00Z')) {
  let now = startAt;
  const clock = () => now;
  const store = createHouseholdStore({ uniqueId: name, getNow: clock });
  return {
    name,
    store,
    lists: createListsRepository(store, clock),
    chores: createChoresRepository(store, clock),
    household: createHouseholdRepository(store, clock),
    tick(ms = 1_000) {
      now += ms;
    },
    setTime(instant: number) {
      now = instant;
    },
  };
}

export type Device = ReturnType<typeof createDevice>;

/** What a sync round does: each side applies whatever the other has. */
export function exchange(a: HouseholdStore, b: HouseholdStore): void {
  a.applyMergeableChanges(b.getMergeableContent());
  b.applyMergeableChanges(a.getMergeableContent());
}

export function contentOf(store: HouseholdStore) {
  return store.getContent();
}
