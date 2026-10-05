import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { useHousehold } from '@/composition/AppProvider';
import { useTheme } from '@/core/theme';
import {
  EmptyState,
  Screen,
  SectionTitle,
  SegmentedControl,
  Text,
  ScalePressable,
} from '@/core/ui';
import { useToday } from '@/features/chores/hooks/useChores';
import { HouseholdHeader } from '@/features/households/components/HouseholdHeader';
import {
  useCurrentMemberId,
  useHouseholdTimeZone,
  useMemberMap,
} from '@/features/households/hooks/useHouseholdData';
import { QuickAddButton } from '@/features/quick-add/components/QuickAddButton';

import { AddItemField } from '../components/AddItemField';
import { ItemRow } from '../components/ItemRow';
import { useItemActions } from '../hooks/useItemActions';
import { useListItems, useLists } from '../hooks/useLists';
import { groupItems, progressOf } from '../lib/grouping';

export function ListsScreen() {
  const lists = useLists();
  const [selected, setSelected] = useState<string | null>(null);
  const list = lists.find((entry) => entry.id === selected) ?? lists[0] ?? null;
  const items = useListItems(list?.id ?? '');
  const members = useMemberMap();
  const memberId = useCurrentMemberId();
  const today = useToday();
  const timeZone = useHouseholdTimeZone();
  const actions = useItemActions();
  const { repos } = useHousehold();
  const { spacing } = useTheme();

  const sections = list ? groupItems(items, list.kind) : [];
  const progress = progressOf(items);

  return (
    <Screen testID="lists-screen">
      <HouseholdHeader title="Lists" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: 180,
          gap: spacing.md,
        }}>
        {lists.length > 1 && list ? (
          <SegmentedControl
            testID="list-picker"
            options={lists.map((entry) => ({ value: entry.id, label: entry.name }))}
            value={list.id}
            onChange={setSelected}
          />
        ) : null}
        {list ? (
          <>
            <AddItemField
              placeholder={list.kind === 'grocery' ? 'Add to groceries' : 'Add a to-do'}
              onAdd={(title) => repos.lists.addItem(list.id, { title, createdBy: memberId })}
            />
            <Text variant="caption" color="textMuted">
              {progress.total === 0
                ? 'Nothing here yet'
                : `${progress.total - progress.done} to go · ${progress.done} done`}
            </Text>
          </>
        ) : null}
        {sections.length === 0 ? (
          <EmptyState
            icon={list?.kind === 'grocery' ? 'cart' : 'checklist'}
            title="All clear"
            message="Add something above, or use Quick add to drop in a whole shopping run at once."
          />
        ) : (
          sections.map((section) => (
            <Animated.View
              key={section.key}
              layout={LinearTransition}
              entering={FadeIn}
              style={{ gap: spacing.xs }}>
              <SectionTitle
                trailing={
                  section.key === 'done' && list ? (
                    <ScalePressable
                      testID="clear-done"
                      accessibilityRole="button"
                      onPress={() => actions.onClearDone(list.id)}>
                      <Text variant="caption" color="accent">
                        Clear
                      </Text>
                    </ScalePressable>
                  ) : undefined
                }>
                {section.title}
              </SectionTitle>
              <View style={{ gap: spacing.xs }}>
                {section.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    assignee={item.assigneeId ? members.get(item.assigneeId) : undefined}
                    today={today}
                    timeZone={timeZone}
                    onToggle={actions.onToggle}
                    onDelete={actions.onDelete}
                    onMove={actions.onMove}
                    onOpen={actions.onOpen}
                  />
                ))}
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
      <QuickAddButton />
    </Screen>
  );
}
