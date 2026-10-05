import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useApp } from '@/composition/AppProvider';
import { useTheme } from '@/core/theme';
import { Avatar, Button, Card, ScalePressable, Screen, Text, TextField } from '@/core/ui';
import { useSyncState } from '@/features/sync/hooks/useSync';

import { useHouseholdName, useMembers } from '../hooks/useHouseholdData';

/**
 * After joining: pick yourself from the household, or add yourself. Members
 * appear as the first sync lands, which is usually well under a second.
 */
export function WhoScreen() {
  const { actions } = useApp();
  const members = useMembers();
  const householdName = useHouseholdName();
  const sync = useSyncState();
  const router = useRouter();
  const [name, setName] = useState('');
  const { colors, spacing } = useTheme();

  const done = () => router.replace('/lists');

  return (
    <Screen scroll testID="who-screen" edges={['top', 'bottom']}>
      <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
        <Text variant="overline" color="textFaint">
          {householdName || 'Joining'}
        </Text>
        <Text variant="display">Which one is you?</Text>
      </View>
      {members.length === 0 ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <ActivityIndicator color={colors.accent} />
          <Text color="textMuted">
            {sync.phase === 'offline' ? 'Waiting for the sync server…' : 'Fetching the household…'}
          </Text>
        </Card>
      ) : (
        <Card style={{ gap: spacing.sm }}>
          {members.map((member) => (
            <ScalePressable
              key={member.id}
              testID={`claim-${member.id}`}
              accessibilityRole="button"
              accessibilityLabel={`I'm ${member.name}`}
              onPress={() => {
                actions.claimMember(member.id);
                done();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.sm,
              }}>
              <Avatar name={member.name} color={member.color} size={36} />
              <Text variant="headline" style={{ flex: 1 }}>
                {member.name}
              </Text>
              {member.leftAt ? (
                <Text variant="caption" color="textFaint">
                  left
                </Text>
              ) : null}
            </ScalePressable>
          ))}
        </Card>
      )}
      <Card style={{ gap: spacing.md }}>
        <Text variant="headline">I&apos;m new here</Text>
        <TextField
          testID="new-member-name"
          placeholder="Your name"
          value={name}
          onChangeText={setName}
        />
        <Button
          testID="join-as-new"
          label="Join as a new member"
          disabled={!name.trim()}
          onPress={() => {
            actions.joinAsNewMember(name);
            done();
          }}
        />
      </Card>
    </Screen>
  );
}
