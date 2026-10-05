import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function TextField({
  icon,
  label,
  style,
  ...rest
}: TextInputProps & { icon?: IconName; label?: string }) {
  const { colors, radii, spacing, typography } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.surfaceSunken,
          borderRadius: radii.md,
          paddingHorizontal: spacing.md,
          minHeight: 46,
        }}>
        {icon && <Icon name={icon} size={16} color={colors.textFaint} />}
        <TextInput
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.accent}
          accessibilityLabel={label ?? rest.placeholder}
          {...rest}
          style={[
            typography.body,
            { flex: 1, color: colors.text, paddingVertical: spacing.sm },
            style,
          ]}
        />
      </View>
    </View>
  );
}
