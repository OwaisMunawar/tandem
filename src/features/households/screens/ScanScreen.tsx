import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { toTandemError } from '@/core/errors/TandemError';
import { useTheme } from '@/core/theme';
import { Button, Screen, Text, TextField } from '@/core/ui';

import { parseInvite, type Invite } from '../lib/invite';

/** Scan a QR invite, or paste the link when there is no camera (simulators, desktops). */
export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);
  const router = useRouter();
  const { colors, radii, spacing } = useTheme();

  const openInvite = (invite: Invite) =>
    router.replace({
      pathname: '/join',
      params: { room: invite.roomId, server: invite.serverUrl, name: invite.householdName },
    });

  const tryLink = (raw: string) => {
    try {
      openInvite(parseInvite(raw));
    } catch (cause) {
      setError(toTandemError(cause, 'INVALID_INVITE').message);
    }
  };

  return (
    <Screen
      testID="scan-screen"
      edges={['bottom']}
      contentStyle={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
      <View
        style={{
          aspectRatio: 1,
          borderRadius: radii.xl,
          overflow: 'hidden',
          backgroundColor: colors.surfaceSunken,
          justifyContent: 'center',
        }}>
        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (handled.current) return;
              try {
                const invite = parseInvite(data);
                handled.current = true;
                openInvite(invite);
              } catch {
                setError('That QR code is not a Tandem invite.');
              }
            }}
          />
        ) : (
          <View style={{ padding: spacing.xl, gap: spacing.md, alignItems: 'center' }}>
            <Text align="center" color="textMuted">
              Tandem needs the camera only to read the invite code.
            </Text>
            <Button
              label="Allow camera"
              icon="scan"
              compact
              onPress={() => void requestPermission()}
            />
          </View>
        )}
      </View>
      <TextField
        testID="invite-link"
        label="Or paste an invite link"
        placeholder="tandem://join?room=…"
        value={link}
        onChangeText={(value) => {
          setLink(value);
          setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <Text color="danger">{error}</Text> : null}
      <Button
        testID="open-link"
        label="Open invite"
        variant="secondary"
        disabled={!link.trim()}
        onPress={() => tryLink(link)}
      />
    </Screen>
  );
}
