import { Platform } from 'react-native';

import TodayChoresWidget from '../TodayChoresWidget';
import { type TodayWidgetProps } from '../lib/todaySnapshot';

/**
 * Pushes a fresh snapshot to the iOS widget through the shared app group.
 * Android has no expo-widgets support yet (see the README roadmap), so this
 * is a no-op there rather than a crash.
 */
export function publishTodaySnapshot(props: TodayWidgetProps): void {
  if (Platform.OS !== 'ios') return;
  try {
    TodayChoresWidget.updateSnapshot(props);
  } catch {
    // Widgets are a nicety: a missing app group must never break the app.
  }
}
