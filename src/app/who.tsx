import { Redirect } from 'expo-router';

import { useApp } from '@/composition/AppProvider';
import { WhoScreen } from '@/features/households/screens/WhoScreen';

export default function WhoRoute() {
  const { status } = useApp();
  if (status.kind !== 'ready') return <Redirect href="/" />;
  return <WhoScreen />;
}
