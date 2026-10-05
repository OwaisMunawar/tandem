import { useLocalSearchParams } from 'expo-router';

import { ItemScreen } from '@/features/lists/screens/ItemScreen';

export default function ItemRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ItemScreen key={id} itemId={id} />;
}
