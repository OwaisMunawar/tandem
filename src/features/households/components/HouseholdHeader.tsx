import { type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Text } from '@/core/ui';
import { PresenceBar } from '@/features/sync/components/PresenceBar';
import { SyncPill } from '@/features/sync/components/SyncPill';

import { useHouseholdName } from '../hooks/useHouseholdData';

/** Shared tab header: household name, page title, live sync state and who is around. */
export function HouseholdHeader({ title, trailing }: { title: string; trailing?: ReactNode }) {
  const name = useHouseholdName();
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="overline" color="textFaint" numberOfLines={1} style={{ flex: 1 }}>
          {name}
        </Text>
        <SyncPill />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="display" accessibilityRole="header">
          {title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {trailing}
          <PresenceBar />
        </View>
      </View>
    </View>
  );
}
