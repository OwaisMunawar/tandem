import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useApp } from '@/composition/AppProvider';
import { toTandemError } from '@/core/errors/TandemError';
import { useTheme } from '@/core/theme';
import { Button, Card, EmptyState, Screen, Text } from '@/core/ui';

import { inviteFromParams, type Invite } from '../lib/invite';

/** Landing screen for tandem://join links and scanned codes. Joining always asks first. */
export function JoinScreen({ params }: { params: Record<string, string | string[] | undefined> }) {
  const { status, actions } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { spacing } = useTheme();

  let invite: Invite | null = null;
  let problem: string | null = null;
  try {
    invite = inviteFromParams(params);
  } catch (cause) {
    problem = toTandemError(cause, 'INVALID_INVITE').message;
  }

  if (!invite) {
    return (
      <Screen>
        <EmptyState icon="link" title="That invite did not work" message={problem ?? ''} />
        <Button label="Back" variant="secondary" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const alreadyIn = status.kind === 'ready' && status.runtime.roomId === invite.roomId;
  const replacing = status.kind === 'ready' && !alreadyIn;

  return (
    <Screen
      testID="join-screen"
      edges={['top', 'bottom']}
      contentStyle={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
      <View style={{ gap: spacing.sm, marginTop: spacing.xxl }}>
        <Text variant="overline" color="textFaint">
          Invite
        </Text>
        <Text variant="display">{invite.householdName || 'A household'}</Text>
        <Text color="textMuted">Syncs through {invite.serverUrl}</Text>
      </View>
      {replacing ? (
        <Card>
          <Text color="warning">
            Joining replaces the household on this phone. Its lists stay with the other members.
          </Text>
        </Card>
      ) : null}
      <Button
        testID="confirm-join"
        label={alreadyIn ? 'Open household' : 'Join household'}
        loading={busy}
        onPress={async () => {
          if (alreadyIn) {
            router.replace('/lists');
            return;
          }
          setBusy(true);
          try {
            if (invite) await actions.joinHousehold(invite);
            router.replace('/who');
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button label="Not now" variant="ghost" onPress={() => router.replace('/')} />
    </Screen>
  );
}
