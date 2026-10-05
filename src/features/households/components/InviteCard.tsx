import * as Clipboard from 'expo-clipboard';
import { Share, View } from 'react-native';

import { useHousehold } from '@/composition/AppProvider';
import { useTheme } from '@/core/theme';
import { Button, Card, Text, useToast } from '@/core/ui';

import { useHouseholdName } from '../hooks/useHouseholdData';
import { buildInviteUrl } from '../lib/invite';
import { InviteQr } from './InviteQr';

export function InviteCard() {
  const { roomId, serverUrl } = useHousehold();
  const householdName = useHouseholdName();
  const toast = useToast();
  const { spacing } = useTheme();
  const url = buildInviteUrl({ roomId, serverUrl, householdName });

  return (
    <Card testID="invite-card" style={{ alignItems: 'center', gap: spacing.md }}>
      <InviteQr value={url} size={196} />
      <Text variant="caption" color="textMuted" align="center">
        Scan with Tandem on another phone to join. Anyone with this code can see and edit the
        household.
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Share link"
            icon="share"
            compact
            onPress={() => void Share.share({ message: `Join ${householdName} on Tandem: ${url}` })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Copy"
            icon="link"
            variant="secondary"
            compact
            onPress={async () => {
              await Clipboard.setStringAsync(url);
              toast.show({ message: 'Invite link copied' });
            }}
          />
        </View>
      </View>
    </Card>
  );
}
