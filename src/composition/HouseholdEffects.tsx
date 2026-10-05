import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useHousehold } from '@/composition/AppProvider';
import { useReminders } from '@/features/reminders/hooks/useReminders';
import { useWidgetSync } from '@/features/widget/hooks/useWidgetSync';

/**
 * Side effects that follow the household wherever the user is in the app:
 * reminders, the widget snapshot, and pausing presence in the background.
 */
export function HouseholdEffects() {
  const { beacon } = useHousehold();
  useReminders();
  useWidgetSync();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') beacon.resume();
      else beacon.suspend();
    });
    return () => subscription.remove();
  }, [beacon]);

  return null;
}
