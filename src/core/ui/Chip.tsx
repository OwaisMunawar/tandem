import { useTheme } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { ScalePressable } from './Pressable';
import { Text } from './Text';

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  color,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Overrides the accent, used for member-coloured chips. */
  color?: string;
  testID?: string;
}) {
  const { colors, radii, spacing } = useTheme();
  const accent = color ?? colors.accent;
  const fg = selected ? accent : colors.textMuted;

  return (
    <ScalePressable
      testID={testID}
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected } : undefined}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        height: 32,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: selected ? accent : 'transparent',
        backgroundColor: selected ? colors.surface : colors.surfaceSunken,
      }}>
      {icon && <Icon name={icon} size={13} color={fg} />}
      <Text variant="caption" style={{ color: fg }}>
        {label}
      </Text>
    </ScalePressable>
  );
}
