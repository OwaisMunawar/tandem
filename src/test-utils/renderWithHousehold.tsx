import { render, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import { AppProvider, useApp } from '@/composition/AppProvider';
import { type HouseholdRuntime } from '@/composition/householdRuntime';
import { createMemoryPlatform } from '@/composition/memoryPlatform';
import { ThemeProvider } from '@/core/theme';
import { ToastProvider } from '@/core/ui';
import { seedDemoHousehold } from '@/demo/seed';
import { toZonedDate } from '@/features/chores/lib/zonedTime';

export const TEST_ROOM = 'AbCdEfGhIjKlMnOpQrStUv';
const TIME_ZONE = 'Europe/London';

/**
 * Renders a screen inside the real composition root, with storage swapped
 * for memory. The "disk" already holds the demo household, exactly as if
 * the app were relaunched on a phone that had it, so screens see real
 * repositories, real hooks and real CRDT writes.
 */
export async function renderWithHousehold(ui: ReactNode) {
  const handle = { close: async () => undefined, erase: async () => undefined };
  const runtime: { current: HouseholdRuntime | null } = { current: null };

  const platform = createMemoryPlatform({
    timeZone: () => TIME_ZONE,
    persistDevice: async (store) => {
      store.setValues({
        ...store.getValues(),
        roomId: TEST_ROOM,
        memberId: 'ngozi',
        deviceId: 'test-device',
      });
      return handle;
    },
    persistHousehold: async (store) => {
      const now = Date.now();
      seedDemoHousehold(store, { today: toZonedDate(now, TIME_ZONE), timeZone: TIME_ZONE, now });
      return handle;
    },
  });

  function Ready({ children }: { children: ReactNode }) {
    const { status } = useApp();
    if (status.kind !== 'ready') return null;
    runtime.current = status.runtime;
    return <>{children}</>;
  }

  const result = await render(
    <ThemeProvider preference="light">
      <ToastProvider>
        <AppProvider platform={platform}>
          <Ready>{ui}</Ready>
        </AppProvider>
      </ToastProvider>
    </ThemeProvider>,
  );
  await waitFor(() => expect(runtime.current).not.toBeNull());
  if (!runtime.current) throw new Error('Household did not open');
  return { ...result, runtime: runtime.current };
}
