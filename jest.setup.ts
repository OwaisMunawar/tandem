/* eslint-disable @typescript-eslint/no-require-imports */
// Component tests render real screens over an in-memory MergeableStore. Only
// native views and device APIs are replaced here.
import 'react-native-gesture-handler/jestSetup';
import 'react-native-reanimated/mock';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('expo-crypto', () => {
  const { randomFillSync, randomUUID } = require('node:crypto');
  return {
    getRandomValues: <T extends Uint8Array>(array: T) => randomFillSync(array),
    randomUUID,
  };
});

jest.mock('expo-symbols', () => ({ SymbolView: () => null }));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

jest.mock('expo-router', () => {
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismiss: jest.fn() };
  return {
    useRouter: () => router,
    useLocalSearchParams: jest.fn(() => ({})),
    Stack: { Screen: () => null },
    Link: ({ children }: { children: unknown }) => children,
    __router: router,
  };
});

// ReanimatedSwipeable mixes worklet and JS callbacks, which the gesture
// handler only warns about under the Reanimated mock. Everything else that
// reaches console.error still fails loudly.
const originalError = console.error;
jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Some of the callbacks in the gesture are worklets')
  )
    return;
  originalError(...args);
});
