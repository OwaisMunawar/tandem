import { useLocalSearchParams } from 'expo-router';

import { ChoreScreen } from '@/features/chores/screens/ChoreScreen';

export default function ChoreRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChoreScreen key={id} choreId={id} />;
}
