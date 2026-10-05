import { type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme, type ColorRoles } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const toneRoles: Record<Tone, { fg: keyof ColorRoles; bg: keyof ColorRoles }> = {
  success: { fg: 'success', bg: 'successSoft' },
  warning: { fg: 'warning', bg: 'warningSoft' },
  danger: { fg: 'danger', bg: 'dangerSoft' },
  info: { fg: 'info', bg: 'infoSoft' },
  neutral: { fg: 'textMuted', bg: 'surfaceSunken' },
};

export function Pill({
  label,
  tone = 'neutral',
  icon,
  leading,
  testID,
}: {
  label: string;
  tone?: Tone;
  icon?: IconName;
  leading?: ReactNode;
  testID?: string;
}) {
  const { colors, radii, spacing } = useTheme();
  const role = toneRoles[tone];
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm + 2,
        height: 26,
        borderRadius: radii.pill,
        backgroundColor: colors[role.bg],
      }}>
      {leading}
      {icon && <Icon name={icon} size={13} color={colors[role.fg]} />}
      <Text variant="caption" style={{ color: colors[role.fg] }}>
        {label}
      </Text>
    </View>
  );
}
