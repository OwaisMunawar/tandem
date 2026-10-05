import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useApp } from '@/composition/AppProvider';
import { useDeviceValue } from '@/core/store/hooks';
import { useTheme } from '@/core/theme';

export default function TabsLayout() {
  const { status, device } = useApp();
  const memberId = useDeviceValue('memberId', device) ?? '';
  const { colors } = useTheme();
  if (status.kind !== 'ready') return <Redirect href="/" />;
  if (!memberId) return <Redirect href="/who" />;

  return (
    <NativeTabs tintColor={colors.accent} backgroundColor={colors.background}>
      <NativeTabs.Trigger name="lists">
        <NativeTabs.Trigger.Label>Lists</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'cart', selected: 'cart.fill' }}
          md="shopping_cart"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chores">
        <NativeTabs.Trigger.Label>Chores</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bubbles.and.sparkles', selected: 'bubbles.and.sparkles.fill' }}
          md="cleaning_services"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="household">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
