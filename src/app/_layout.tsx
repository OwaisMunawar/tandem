import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProvider, useApp } from '@/composition/AppProvider';
import { HouseholdEffects } from '@/composition/HouseholdEffects';
import { nativePlatform } from '@/composition/nativePlatform';
import { useDeviceValue } from '@/core/store/hooks';
import { ThemeProvider, useTheme, type SchemePreference } from '@/core/theme';
import { ToastProvider } from '@/core/ui';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider platform={nativePlatform}>
        <ThemedApp />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const { device } = useApp();
  const preference = (useDeviceValue('colorScheme', device) ?? 'system') as SchemePreference;
  return (
    <ThemeProvider preference={preference}>
      <Navigation />
    </ThemeProvider>
  );
}

function Navigation() {
  const theme = useTheme();
  const { status } = useApp();
  const { colors } = theme;

  useEffect(() => {
    if (status.kind !== 'booting') void SplashScreen.hideAsync();
  }, [status.kind]);

  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      primary: colors.accent,
      border: colors.border,
    },
  };

  return (
    <NavigationTheme value={navigationTheme}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <ToastProvider>
        {status.kind === 'ready' ? <HouseholdEffects key={status.runtime.roomId} /> : null}
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="join" options={{ headerShown: false }} />
          <Stack.Screen name="who" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="scan" options={{ title: 'Scan invite', presentation: 'modal' }} />
          {/* Page-sheet modals: formSheet detents trap on iOS 26 with screens 4.26. */}
          <Stack.Screen name="quick-add" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="item/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="chore/[id]" options={{ presentation: 'modal' }} />
        </Stack>
      </ToastProvider>
    </NavigationTheme>
  );
}
