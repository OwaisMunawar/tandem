import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Text } from './Text';

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}

export function Avatar({
  name,
  color,
  size = 32,
  online,
  testID,
}: {
  name: string;
  color: string;
  size?: number;
  /** Draws a presence dot when defined. */
  online?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  const dot = Math.max(8, Math.round(size * 0.3));
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={online === undefined ? name : `${name}, ${online ? 'online' : 'away'}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: size * 0.4,
          lineHeight: size * 0.5,
          fontWeight: '700',
        }}>
        {initialsOf(name)}
      </Text>
      {online !== undefined && (
        <View
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            borderWidth: 2,
            borderColor: colors.background,
            backgroundColor: online ? colors.success : colors.textFaint,
          }}
        />
      )}
    </View>
  );
}
