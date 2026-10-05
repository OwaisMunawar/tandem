import { type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Text } from './Text';

export function SectionTitle({ children, trailing }: { children: string; trailing?: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
      }}>
      <Text variant="overline" color="textFaint" accessibilityRole="header">
        {children}
      </Text>
      {trailing}
    </View>
  );
}
