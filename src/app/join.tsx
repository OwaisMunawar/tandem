import { useLocalSearchParams } from 'expo-router';

import { JoinScreen } from '@/features/households/screens/JoinScreen';

export default function JoinRoute() {
  return <JoinScreen params={useLocalSearchParams()} />;
}
