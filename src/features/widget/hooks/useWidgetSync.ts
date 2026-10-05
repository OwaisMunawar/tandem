import { useEffect } from 'react';

import { useChores, useToday } from '@/features/chores/hooks/useChores';
import {
  useHouseholdName,
  useHouseholdTimeZone,
  useMemberMap,
} from '@/features/households/hooks/useHouseholdData';

import { publishTodaySnapshot } from '../data/nativeWidget';
import { buildTodaySnapshot } from '../lib/todaySnapshot';

/** Republishes the widget snapshot whenever chores change, from any phone. */
export function useWidgetSync(): void {
  const chores = useChores();
  const members = useMemberMap();
  const today = useToday();
  const timeZone = useHouseholdTimeZone();
  const householdName = useHouseholdName();

  useEffect(() => {
    const timer = setTimeout(
      () =>
        publishTodaySnapshot(
          buildTodaySnapshot({ householdName, chores, members, today, timeZone }),
        ),
      500,
    );
    return () => clearTimeout(timer);
  }, [chores, householdName, members, timeZone, today]);
}
