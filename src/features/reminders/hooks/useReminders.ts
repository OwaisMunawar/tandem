import { useEffect } from 'react';

import { useApp } from '@/composition/AppProvider';
import { useDeviceValue } from '@/core/store/hooks';
import { useChores } from '@/features/chores/hooks/useChores';
import {
  useCurrentMemberId,
  useHouseholdName,
  useHouseholdTimeZone,
} from '@/features/households/hooks/useHouseholdData';
import { useAllItems } from '@/features/lists/hooks/useLists';

import { expoNotificationPort } from '../data/expoNotifications';
import { clearReminders, syncReminders } from '../data/reminderScheduler';
import { planReminders } from '../lib/reminderPlan';

/**
 * Keeps scheduled notifications in step with the household. Runs on every
 * change, local or remote, debounced so a sync burst reschedules once.
 */
export function useReminders(): void {
  const { device, platform } = useApp();
  const enabled = useDeviceValue('remindersEnabled', device) ?? false;
  const chores = useChores();
  const items = useAllItems();
  const memberId = useCurrentMemberId();
  const timeZone = useHouseholdTimeZone();
  const householdName = useHouseholdName();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!enabled) {
        void clearReminders(expoNotificationPort).catch(() => undefined);
        return;
      }
      const desired = planReminders({
        chores,
        items,
        memberId,
        timeZone,
        now: platform.now(),
        householdName,
      });
      void syncReminders(expoNotificationPort, desired).catch(() => undefined);
    }, 800);
    return () => clearTimeout(timer);
  }, [chores, enabled, householdName, items, memberId, platform, timeZone]);
}
