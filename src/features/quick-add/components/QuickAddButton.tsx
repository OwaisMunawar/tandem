import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { Icon, ScalePressable, Text } from '@/core/ui';

/** Floating entry point to quick add, shared by the Lists and Chores tabs. */
export function QuickAddButton() {
  const router = useRouter();
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScalePressable
      testID="quick-add-button"
      accessibilityRole="button"
      accessibilityLabel="Quick add"
      accessibilityHint="Type several items, to-dos or chores in one sentence"
      onPress={() => router.push('/quick-add')}
      style={{
        position: 'absolute',
        right: spacing.lg,
        // Clears the floating native tab bar, which content scrolls under.
        bottom: insets.bottom + 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        height: 52,
        borderRadius: radii.pill,
        backgroundColor: colors.accent,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}>
      <Icon name="sparkles" size={18} color={colors.onAccent} />
      <Text variant="headline" style={{ color: colors.onAccent }}>
        Quick add
      </Text>
    </ScalePressable>
  );
}
