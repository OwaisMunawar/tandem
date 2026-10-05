import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useTheme } from '@/core/theme';
import { Text } from '@/core/ui';
import { useMemberMap } from '@/features/households/hooks/useHouseholdData';
import { firstName } from '@/features/households/lib/members';

import { useEditors } from '../hooks/useSync';

/** "Linnea is editing", shown on a row while someone else has it open. */
export function EditingBadge({ targetId }: { targetId: string }) {
  const editors = useEditors(targetId);
  const members = useMemberMap();
  const { colors, radii, spacing } = useTheme();
  const editor = editors[0] ? members.get(editors[0]) : undefined;
  if (!editor) return null;

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      testID={`editing-${targetId}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radii.pill,
        backgroundColor: colors.surfaceSunken,
      }}>
      <Animated.View
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: editor.color }}
      />
      <Text variant="caption" style={{ color: editor.color }}>
        {firstName(editor.name)} is editing
      </Text>
    </Animated.View>
  );
}
