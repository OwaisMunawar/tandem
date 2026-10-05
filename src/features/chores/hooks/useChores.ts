import { useMemo } from 'react';

import { useHousehold } from '@/composition/AppProvider';
import { useNow } from '@/core/hooks/useNow';
import { useTable } from '@/core/store/hooks';
import { useHouseholdTimeZone } from '@/features/households/hooks/useHouseholdData';

import { decodeChore } from '../data/choresRepository';
import { type Chore } from '../lib/chore';
import { compareLocalDates } from '../lib/localDate';
import { toZonedDate } from '../lib/zonedTime';

export function useChores(): Chore[] {
  const { store } = useHousehold();
  const table = useTable('chores', store);
  return useMemo(
    () =>
      Object.entries(table)
        .map(([id, row]) =>
          decodeChore(id, {
            title: row.title ?? '',
            assigneeId: row.assigneeId ?? '',
            rotation: row.rotation ?? '[]',
            recurrence: row.recurrence ?? '',
            dueDate: row.dueDate ?? '',
            dueTime: row.dueTime ?? '09:00',
            createdAt: row.createdAt ?? 0,
            lastDoneAt: row.lastDoneAt ?? 0,
            lastDoneBy: row.lastDoneBy ?? '',
          }),
        )
        .sort(
          (a, b) =>
            compareLocalDates(a.dueDate, b.dueDate) ||
            a.dueTime.localeCompare(b.dueTime) ||
            a.title.localeCompare(b.title),
        ),
    [table],
  );
}

export function useChore(choreId: string): Chore | null {
  return useChores().find((chore) => chore.id === choreId) ?? null;
}

/** Today in the household's zone, rolling over at local midnight. */
export function useToday(): string {
  const timeZone = useHouseholdTimeZone();
  const now = useNow(60_000);
  return toZonedDate(now, timeZone);
}
