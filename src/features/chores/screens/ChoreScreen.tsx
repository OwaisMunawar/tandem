import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useHousehold } from '@/composition/AppProvider';
import { toTandemError } from '@/core/errors/TandemError';
import { useTheme } from '@/core/theme';
import { Button, Chip, SectionTitle, SwitchRow, Text, TextField, useToast } from '@/core/ui';
import { MemberPicker, RotationPicker } from '@/features/households/components/MemberPicker';
import { useEditingPresence } from '@/features/sync/hooks/useSync';

import { RecurrencePicker } from '../components/RecurrencePicker';
import { useChore, useToday } from '../hooks/useChores';
import { type ChoreDraft } from '../lib/chore';
import { weekdayOf } from '../lib/localDate';
import { quickDates } from '../lib/quickDates';
import { DAILY, firstDueDate } from '../lib/recurrence';

const TIMES = ['07:00', '09:00', '12:00', '18:00', '20:00'] as const;

/** Create and edit share one form. Edits are saved as one write on Save. */
export function ChoreScreen({ choreId }: { choreId: string }) {
  const isNew = choreId === 'new';
  const existing = useChore(choreId);
  const today = useToday();
  const { repos } = useHousehold();
  const router = useRouter();
  const toast = useToast();
  const { spacing } = useTheme();
  useEditingPresence(isNew ? '' : choreId);

  const [draft, setDraft] = useState<
    ChoreDraft & { rotation: string[]; assigneeId: string; dueTime: string }
  >(() => ({
    title: existing?.title ?? '',
    recurrence: existing?.recurrence ?? DAILY,
    dueDate: existing?.dueDate ?? today,
    dueTime: existing?.dueTime ?? '09:00',
    assigneeId: existing?.assigneeId ?? '',
    rotation: existing?.rotation ?? [],
  }));
  const [rotate, setRotate] = useState((existing?.rotation.length ?? 0) > 0);
  const [error, setError] = useState<string | null>(null);
  const update = (patch: Partial<typeof draft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const save = () => {
    try {
      const rotation = rotate ? draft.rotation : [];
      // Whoever is assigned must be in the rotation, or the first turn is skipped.
      const assigneeId =
        rotation.length > 0 && !rotation.includes(draft.assigneeId)
          ? (rotation[0] ?? '')
          : draft.assigneeId;
      const payload = {
        ...draft,
        rotation,
        assigneeId,
        dueDate: isNew ? firstDueDate(draft.recurrence, draft.dueDate) : draft.dueDate,
      };
      if (isNew) repos.chores.addChore(payload);
      else repos.chores.updateChore(choreId, payload);
      router.back();
    } catch (cause) {
      setError(toTandemError(cause, 'INVALID_INPUT').message);
    }
  };

  return (
    <ScrollView
      testID="chore-screen"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Stack.Screen options={{ title: isNew ? 'New chore' : 'Edit chore' }} />
      <TextField
        testID="chore-title"
        label="Chore"
        placeholder="e.g. Take out the bins"
        value={draft.title}
        onChangeText={(title) => update({ title })}
        autoFocus={isNew}
      />

      <View style={{ gap: spacing.sm }}>
        <SectionTitle>Repeats</SectionTitle>
        <RecurrencePicker
          value={draft.recurrence}
          onChange={(recurrence) => update({ recurrence })}
          defaultWeekday={weekdayOf(draft.dueDate)}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionTitle>{isNew ? 'Starts' : 'Next due'}</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {quickDates(today).map((option) => (
            <Chip
              key={option.key}
              label={option.label}
              selected={draft.dueDate === option.date}
              onPress={() => update({ dueDate: option.date })}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {TIMES.map((time) => (
            <Chip
              key={time}
              label={time}
              selected={draft.dueTime === time}
              onPress={() => update({ dueTime: time })}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionTitle>Who</SectionTitle>
        <MemberPicker
          testID="chore-assignee"
          value={draft.assigneeId}
          onChange={(assigneeId) => update({ assigneeId })}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <SwitchRow
          testID="chore-rotate"
          title="Take turns"
          detail="Hand the chore to the next person each time it is done."
          value={rotate}
          onChange={(on) => {
            setRotate(on);
            if (on && draft.rotation.length === 0 && draft.assigneeId)
              update({ rotation: [draft.assigneeId] });
          }}
        />
        {rotate ? (
          <RotationPicker value={draft.rotation} onChange={(rotation) => update({ rotation })} />
        ) : null}
      </View>

      {error ? (
        <Text color="danger" variant="callout">
          {error}
        </Text>
      ) : null}

      <Button
        testID="chore-save"
        label={isNew ? 'Add chore' : 'Save'}
        onPress={save}
        disabled={!draft.title.trim()}
      />
      {!isNew && existing ? (
        <Button
          label="Delete chore"
          icon="trash"
          variant="danger"
          onPress={() => {
            const removed = repos.chores.deleteChore(choreId);
            router.back();
            toast.show({
              message: `Deleted “${removed.title}”`,
              actionLabel: 'Undo',
              onAction: () => repos.chores.restoreChore(removed),
            });
          }}
        />
      ) : null}
    </ScrollView>
  );
}
