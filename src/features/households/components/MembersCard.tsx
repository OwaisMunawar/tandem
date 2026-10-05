import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Avatar, Card, Text } from '@/core/ui';
import { useAllItems } from '@/features/lists/hooks/useLists';
import { usePresence } from '@/features/sync/hooks/useSync';

import { useActiveMembers, useCurrentMemberId } from '../hooks/useHouseholdData';

export function MembersCard() {
  const members = useActiveMembers();
  const presence = usePresence();
  const self = useCurrentMemberId();
  const items = useAllItems();
  const { spacing } = useTheme();

  return (
    <Card testID="members-card" style={{ gap: spacing.md }}>
      {members.map((member) => {
        const state = presence.get(member.id);
        const isSelf = member.id === self;
        const editing = state?.editing[0];
        const editingTitle = editing ? items.find((item) => item.id === editing)?.title : undefined;
        const status = isSelf
          ? 'This phone'
          : state?.online
            ? editing
              ? `Editing ${editingTitle ? `“${editingTitle}”` : 'a chore'}`
              : 'Online now'
            : 'Away';
        return (
          <View
            key={member.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar
              name={member.name}
              color={member.color}
              size={38}
              online={isSelf || Boolean(state?.online)}
            />
            <View style={{ flex: 1 }}>
              <Text variant="headline">{member.name}</Text>
              <Text variant="caption" color={state?.online && !isSelf ? 'success' : 'textMuted'}>
                {status}
              </Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}
