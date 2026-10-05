import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Pill } from '@/core/ui';

import { useSyncState } from '../hooks/useSync';
import { describeSync } from '../lib/syncState';

/** Synced / syncing / offline with pending changes, always visible in the header. */
export function SyncPill() {
  const state = useSyncState();
  const badge = describeSync(state);
  const busy = state.phase === 'syncing' || state.phase === 'connecting';
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (busy) {
      pulse.set(withRepeat(withTiming(0.45, { duration: 700 }), -1, true));
    } else {
      cancelAnimation(pulse);
      pulse.set(withTiming(1, { duration: 160 }));
    }
  }, [busy, pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <Animated.View style={style}>
      <Pill testID="sync-pill" label={badge.label} tone={badge.tone} icon={badge.icon} />
    </Animated.View>
  );
}
