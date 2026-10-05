import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useTheme } from '@/core/theme';
import { Avatar } from '@/core/ui';
import { useActiveMembers, useCurrentMemberId } from '@/features/households/hooks/useHouseholdData';

import { usePresence } from '../hooks/useSync';

/** Overlapping avatars; a green dot means that person has the app open right now. */
export function PresenceBar({ size = 28 }: { size?: number }) {
  const members = useActiveMembers();
  const presence = usePresence();
  const self = useCurrentMemberId();
  const { colors } = useTheme();

  return (
    <View testID="presence-bar" style={{ flexDirection: 'row' }}>
      {members.map((member, index) => (
        <Animated.View
          key={member.id}
          entering={FadeIn}
          exiting={FadeOut}
          layout={LinearTransition}
          style={{
            marginLeft: index === 0 ? 0 : -size * 0.22,
            // Earlier avatars sit on top so every presence dot stays visible.
            zIndex: members.length - index,
            borderRadius: size,
            borderWidth: 2,
            borderColor: colors.background,
          }}>
          <Avatar
            name={member.name}
            color={member.color}
            size={size}
            online={member.id === self ? true : (presence.get(member.id)?.online ?? false)}
          />
        </Animated.View>
      ))}
    </View>
  );
}
