import { Redirect } from 'expo-router';

import { useApp } from '@/composition/AppProvider';
import { useDeviceValue } from '@/core/store/hooks';

export default function Index() {
  const { status, device } = useApp();
  const memberId = useDeviceValue('memberId', device) ?? '';
  if (status.kind === 'booting') return null;
  if (status.kind === 'welcome') return <Redirect href="/welcome" />;
  return <Redirect href={memberId ? '/lists' : '/who'} />;
}
