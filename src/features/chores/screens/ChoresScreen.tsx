import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { useTheme } from '@/core/theme';
import { EmptyState, IconButton, Screen, SectionTitle } from '@/core/ui';
import { HouseholdHeader } from '@/features/households/components/HouseholdHeader';
import {
  useActiveMembers,
  useHouseholdTimeZone,
  useMemberMap,
} from '@/features/households/hooks/useHouseholdData';
import { QuickAddButton } from '@/features/quick-add/components/QuickAddButton';

import { ChoreRow } from '../components/ChoreRow';
import { useChoreActions } from '../hooks/useChoreActions';
import { useChores, useToday } from '../hooks/useChores';
import { type Chore } from '../lib/chore';
import { bucketFor, type ChoreBucket } from '../lib/schedule';

const SECTIONS: { key: ChoreBucket; title: string }[] = [
  { key: 'overdue', title: 'Overdue' },
  { key: 'today', title: 'Today' },
  { key: 'upcoming', title: 'Coming up' },
];

export function ChoresScreen() {
  const chores = useChores();
  const members = useMemberMap();
  const active = useActiveMembers();
  const today = useToday();
  const timeZone = useHouseholdTimeZone();
  const router = useRouter();
  const { complete } = useChoreActions();
  const { spacing } = useTheme();
  const activeIds = new Set(active.map((member) => member.id));

  const buckets = new Map<ChoreBucket, Chore[]>();
  for (const chore of chores) {
    const bucket = bucketFor(chore.dueDate, today);
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), chore]);
  }

  const open = (chore: Chore) => router.push({ pathname: '/chore/[id]', params: { id: chore.id } });

  return (
    <Screen testID="chores-screen">
      <HouseholdHeader
        title="Chores"
        trailing={
          <IconButton
            testID="new-chore"
            icon="plus"
            label="New chore"
            filled
            size={34}
            onPress={() => router.push({ pathname: '/chore/[id]', params: { id: 'new' } })}
          />
        }
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: 180,
          gap: spacing.md,
        }}>
        {chores.length === 0 ? (
          <EmptyState
            icon="chores"
            title="No chores yet"
            message="Try Quick add: “Sam does dishes daily, bins every Monday and Thursday, take turns hoovering weekly”."
          />
        ) : (
          SECTIONS.map(({ key, title }) => {
            const rows = buckets.get(key);
            if (!rows?.length) return null;
            return (
              <Animated.View key={key} layout={LinearTransition} style={{ gap: spacing.xs }}>
                <SectionTitle>{title}</SectionTitle>
                <View style={{ gap: spacing.xs }}>
                  {rows.map((chore) => (
                    <ChoreRow
                      key={chore.id}
                      chore={chore}
                      members={members}
                      activeIds={activeIds}
                      today={today}
                      timeZone={timeZone}
                      onComplete={complete}
                      onOpen={open}
                    />
                  ))}
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
      <QuickAddButton />
    </Screen>
  );
}
