import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { useApp } from '@/composition/AppProvider';
import { DEFAULT_SYNC_URL } from '@/core/config/env';
import { toTandemError } from '@/core/errors/TandemError';
import { useTheme } from '@/core/theme';
import { Button, Card, Screen, Text, TextField } from '@/core/ui';

export function WelcomeScreen() {
  const { actions } = useApp();
  const router = useRouter();
  const [householdName, setHouseholdName] = useState('');
  const [yourName, setYourName] = useState('');
  const [serverUrl, setServerUrl] = useState(DEFAULT_SYNC_URL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { spacing } = useTheme();

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await actions.createHousehold({ householdName, yourName, serverUrl });
      router.replace('/lists');
    } catch (cause) {
      setError(toTandemError(cause, 'UNKNOWN').message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll testID="welcome-screen" edges={['top', 'bottom']}>
        <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
          <Text variant="display">Tandem</Text>
          <Text variant="headline" color="textMuted">
            Shared lists and chores that keep working when the Wi-Fi does not.
          </Text>
        </View>
        <Card style={{ gap: spacing.md }}>
          <Text variant="title">Start a household</Text>
          <TextField
            testID="household-name"
            label="Household"
            placeholder="e.g. Flat 4B"
            value={householdName}
            onChangeText={setHouseholdName}
          />
          <TextField
            testID="your-name"
            label="Your name"
            placeholder="What everyone calls you"
            value={yourName}
            onChangeText={setYourName}
          />
          <TextField
            testID="server-url-input"
            label="Sync server"
            placeholder="Leave empty to keep it on this phone"
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {error ? <Text color="danger">{error}</Text> : null}
          <Button
            testID="create-household"
            label="Create household"
            loading={busy}
            disabled={!yourName.trim()}
            onPress={create}
          />
        </Card>
        <Card style={{ gap: spacing.md }}>
          <Text variant="title">Join someone</Text>
          <Text color="textMuted">
            Scan the code on their Home tab, or open the invite link they sent you.
          </Text>
          <Button
            testID="join-scan"
            label="Scan invite"
            icon="scan"
            variant="secondary"
            onPress={() => router.push('/scan')}
          />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
