import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useHousehold } from '@/composition/AppProvider';
import { useTheme } from '@/core/theme';
import { Button, Chip, EmptyState, SectionTitle, TextField, useToast } from '@/core/ui';
import { useToday } from '@/features/chores/hooks/useChores';
import { quickDates } from '@/features/chores/lib/quickDates';
import { toZonedDate, zonedToInstant } from '@/features/chores/lib/zonedTime';
import { MemberPicker } from '@/features/households/components/MemberPicker';
import { useHouseholdTimeZone } from '@/features/households/hooks/useHouseholdData';
import { EditingBadge } from '@/features/sync/components/EditingBadge';
import { useEditingPresence } from '@/features/sync/hooks/useSync';

import { useItem, useList } from '../hooks/useLists';
import { CATEGORY_LABELS, categoriesFor } from '../lib/categories';

/**
 * Text fields commit on blur, not per keystroke. Each commit is one CRDT
 * write, and committing whole values keeps "Oat milk" from merging with a
 * concurrent "Oat mlk" into something neither person typed.
 */
export function ItemScreen({ itemId }: { itemId: string }) {
  const item = useItem(itemId);
  const list = useList(item?.listId ?? '');
  const { repos } = useHousehold();
  const router = useRouter();
  const toast = useToast();
  const today = useToday();
  const timeZone = useHouseholdTimeZone();
  const { spacing } = useTheme();
  useEditingPresence(itemId);

  const [title, setTitle] = useState(item?.title ?? '');
  const [quantity, setQuantity] = useState(item?.quantity ?? '');
  const [note, setNote] = useState(item?.note ?? '');

  if (!item || !list) {
    return (
      <EmptyState
        icon="trash"
        title="Item removed"
        message="Someone deleted this item on another phone."
      />
    );
  }

  const dueDate = item.dueAt ? toZonedDate(item.dueAt, timeZone) : '';

  return (
    <ScrollView
      testID="item-screen"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Stack.Screen options={{ title: list.name }} />
      <EditingBadge targetId={itemId} />
      <TextField
        testID="item-title"
        label="Item"
        value={title}
        onChangeText={setTitle}
        onEndEditing={() => repos.lists.updateItem(itemId, { title })}
      />
      {list.kind === 'grocery' ? (
        <TextField
          testID="item-quantity"
          label="Quantity"
          placeholder="e.g. 2 L, 6, 1 bag"
          value={quantity}
          onChangeText={setQuantity}
          onEndEditing={() => repos.lists.updateItem(itemId, { quantity })}
        />
      ) : null}
      <TextField
        testID="item-note"
        label="Note"
        placeholder="Brand, size, where to find it"
        value={note}
        onChangeText={setNote}
        onEndEditing={() => repos.lists.updateItem(itemId, { note })}
        multiline
      />

      <View style={{ gap: spacing.sm }}>
        <SectionTitle>Category</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {categoriesFor(list.kind).map((category) => (
            <Chip
              key={category}
              label={CATEGORY_LABELS[category]}
              selected={item.category === category}
              onPress={() => repos.lists.updateItem(itemId, { category })}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionTitle>Assigned to</SectionTitle>
        <MemberPicker
          testID="item-assignee"
          value={item.assigneeId}
          onChange={(assigneeId) => repos.lists.updateItem(itemId, { assigneeId })}
        />
      </View>

      {list.kind === 'todo' ? (
        <View style={{ gap: spacing.sm }}>
          <SectionTitle>Due</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Chip
              label="No date"
              selected={!item.dueAt}
              onPress={() => repos.lists.updateItem(itemId, { dueAt: 0 })}
            />
            {quickDates(today).map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                selected={dueDate === option.date}
                onPress={() =>
                  repos.lists.updateItem(itemId, {
                    dueAt: zonedToInstant(option.date, '09:00', timeZone),
                  })
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Move up"
            icon="arrowUp"
            variant="secondary"
            compact
            onPress={() => repos.lists.moveItem(itemId, -1)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Move down"
            icon="arrowDown"
            variant="secondary"
            compact
            onPress={() => repos.lists.moveItem(itemId, 1)}
          />
        </View>
      </View>

      <Button
        testID="item-delete"
        label="Delete item"
        icon="trash"
        variant="danger"
        onPress={() => {
          const removed = repos.lists.deleteItem(itemId);
          router.back();
          toast.show({
            message: `Deleted “${removed.title}”`,
            actionLabel: 'Undo',
            onAction: () => repos.lists.restoreItem(removed),
          });
        }}
      />
    </ScrollView>
  );
}
