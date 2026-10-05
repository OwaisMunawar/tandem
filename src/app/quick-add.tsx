import { useLocalSearchParams } from 'expo-router';

import { QuickAddScreen } from '@/features/quick-add/screens/QuickAddScreen';

export default function QuickAddRoute() {
  const { text } = useLocalSearchParams<{ text?: string }>();
  return <QuickAddScreen initialText={text ?? ''} />;
}
