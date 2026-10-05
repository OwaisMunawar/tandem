import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { useApp, useHousehold } from '@/composition/AppProvider';
import { toTandemError } from '@/core/errors/TandemError';
import { useDeviceValue } from '@/core/store/hooks';
import { useTheme, type SchemePreference } from '@/core/theme';
import {
  Button,
  Card,
  Screen,
  SectionTitle,
  SegmentedControl,
  SwitchRow,
  Text,
  TextField,
} from '@/core/ui';
import { useLlmAvailable } from '@/features/quick-add/hooks/useQuickAdd';
import { requestReminderPermission } from '@/features/reminders/data/expoNotifications';
import { useSyncState } from '@/features/sync/hooks/useSync';

import { HouseholdHeader } from '../components/HouseholdHeader';
import { InviteCard } from '../components/InviteCard';
import { MembersCard } from '../components/MembersCard';

const SCHEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export function HouseholdScreen() {
  const { device, actions } = useApp();
  const { serverUrl } = useHousehold();
  const sync = useSyncState();
  const llmAvailable = useLlmAvailable();
  const paused = useDeviceValue('syncPaused', device) ?? false;
  const reminders = useDeviceValue('remindersEnabled', device) ?? false;
  const quickAddLlm = useDeviceValue('quickAddLlm', device) ?? true;
  const scheme = (useDeviceValue('colorScheme', device) ?? 'system') as SchemePreference;
  const [server, setServer] = useState('ws://localhost:8043');
  const [error, setError] = useState<string | null>(null);
  const { spacing } = useTheme();

  return (
    <Screen testID="household-screen">
      <HouseholdHeader title="Home" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: 140,
          gap: spacing.md,
        }}>
        <SectionTitle>People</SectionTitle>
        <MembersCard />

        <SectionTitle>Invite</SectionTitle>
        {serverUrl ? (
          <InviteCard />
        ) : (
          <Card style={{ gap: spacing.md }}>
            <Text color="textMuted">
              This household lives only on this phone. Connect a sync server to share it; everything
              already here comes with you.
            </Text>
            <TextField
              label="Sync server"
              value={server}
              onChangeText={setServer}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? <Text color="danger">{error}</Text> : null}
            <Button
              label="Connect"
              icon="server"
              onPress={async () => {
                try {
                  setError(null);
                  await actions.connectServer(server);
                } catch (cause) {
                  setError(toTandemError(cause, 'SYNC_UNAVAILABLE').message);
                }
              }}
            />
          </Card>
        )}

        <SectionTitle>Sync</SectionTitle>
        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text variant="caption" color="textMuted">
              Server
            </Text>
            <Text testID="server-url">{serverUrl || 'None, local only'}</Text>
            {sync.lastSyncedAt ? (
              <Text variant="caption" color="textFaint">
                Connected at{' '}
                {new Date(sync.lastSyncedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            ) : null}
          </View>
          {serverUrl ? (
            <SwitchRow
              testID="pause-sync"
              title="Work offline"
              detail="Keep editing on this phone and merge everything when you switch it back."
              value={paused}
              onChange={(value) => void actions.setSyncPaused(value)}
            />
          ) : null}
        </Card>

        <SectionTitle>This phone</SectionTitle>
        <Card style={{ gap: spacing.lg }}>
          <SwitchRow
            testID="reminders"
            title="Reminders"
            detail="Local notifications for your chores and to-dos when they are due."
            value={reminders}
            onChange={async (value) => {
              if (value && !(await requestReminderPermission())) {
                Alert.alert(
                  'Notifications are off',
                  'Allow notifications for Tandem in Settings to get reminders.',
                );
                return;
              }
              actions.setRemindersEnabled(value);
            }}
          />
          {llmAvailable ? (
            <SwitchRow
              title="Smarter quick add"
              detail="Send quick add text to your sync server's language model. Off means everything is parsed on this phone."
              value={quickAddLlm}
              onChange={actions.setQuickAddLlm}
            />
          ) : null}
          <View style={{ gap: spacing.sm }}>
            <Text variant="callout">Appearance</Text>
            <SegmentedControl
              testID="appearance"
              options={SCHEMES}
              value={scheme}
              onChange={actions.setColorScheme}
            />
          </View>
        </Card>

        <Button
          testID="leave-household"
          label="Leave household"
          icon="leave"
          variant="danger"
          onPress={() =>
            Alert.alert(
              'Leave household?',
              'Lists and chores will be removed from this phone. Others keep everything.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Leave',
                  style: 'destructive',
                  onPress: () => void actions.leaveHousehold(),
                },
              ],
            )
          }
        />
      </ScrollView>
    </Screen>
  );
}
