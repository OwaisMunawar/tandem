import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { useHousehold } from '@/composition/AppProvider';
import { useTheme } from '@/core/theme';
import { Button, Pill, Text, useToast } from '@/core/ui';
import { useToday } from '@/features/chores/hooks/useChores';
import {
  useCurrentMemberId,
  useHouseholdTimeZone,
  useMemberMap,
} from '@/features/households/hooks/useHouseholdData';

import { DraftCard } from '../components/DraftCard';
import { applyDrafts } from '../data/applyDrafts';
import { useQuickAdd } from '../hooks/useQuickAdd';
import { type QuickAddOutcome } from '../parsers/quickAddService';

const EXAMPLE = 'milk, eggs and pay rent Friday, Sam does dishes daily';

export function QuickAddScreen({ initialText = '' }: { initialText?: string }) {
  const [text, setText] = useState(initialText);
  const [outcome, setOutcome] = useState<QuickAddOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const { service, buildRequest, llmActive } = useQuickAdd();
  const { repos } = useHousehold();
  const members = useMemberMap();
  const memberId = useCurrentMemberId();
  const timeZone = useHouseholdTimeZone();
  const today = useToday();
  const router = useRouter();
  const toast = useToast();
  const { colors, radii, spacing, typography } = useTheme();

  const preview = async () => {
    if (!text.trim()) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    try {
      const result = await service.parse(buildRequest(text), controller.signal);
      if (!controller.signal.aborted) setOutcome(result);
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (!outcome?.drafts.length) return;
    const summary = applyDrafts(repos, outcome.drafts, { memberId, timeZone });
    const parts = [
      summary.items ? `${summary.items} item${summary.items === 1 ? '' : 's'}` : '',
      summary.chores ? `${summary.chores} chore${summary.chores === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    router.back();
    toast.show({ message: `Added ${parts.join(' and ')}` });
  };

  const drafts = outcome?.drafts ?? [];

  return (
    <ScrollView
      testID="quick-add-screen"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="title">Quick add</Text>
        <Text color="textMuted">
          Type it the way you would say it. Nothing is added until you confirm.
        </Text>
      </View>
      <TextInput
        testID="quick-add-input"
        value={text}
        onChangeText={(value) => {
          setText(value);
          setOutcome(null);
        }}
        placeholder={EXAMPLE}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        multiline
        autoFocus={!initialText}
        accessibilityLabel="What do you want to add?"
        style={[
          typography.body,
          {
            minHeight: 110,
            textAlignVertical: 'top',
            color: colors.text,
            backgroundColor: colors.surfaceSunken,
            borderRadius: radii.md,
            padding: spacing.md,
          },
        ]}
      />
      {!outcome ? (
        <Button
          testID="quick-add-preview"
          label="Preview"
          icon="sparkles"
          loading={busy}
          disabled={!text.trim()}
          onPress={preview}
        />
      ) : null}
      {outcome ? (
        <View style={{ gap: spacing.sm }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="overline" color="textFaint">
              {drafts.length} to add
            </Text>
            <Pill
              testID="parser-badge"
              tone={outcome.parser === 'llm' ? 'info' : 'neutral'}
              icon={outcome.parser === 'llm' ? 'sparkles' : 'offline'}
              label={outcome.parser === 'llm' ? 'Parsed by your server' : 'Parsed on this phone'}
            />
          </View>
          {outcome.fellBack ? (
            <Text variant="caption" color="warning">
              The server could not parse this, so the on-device parser was used.
            </Text>
          ) : null}
          {drafts.map((draft, index) => (
            <DraftCard
              key={`${draft.source}-${index}`}
              draft={draft}
              index={index}
              members={members}
              today={today}
              onRemove={() =>
                setOutcome({ ...outcome, drafts: drafts.filter((_, other) => other !== index) })
              }
            />
          ))}
          <Button
            testID="quick-add-confirm"
            label={drafts.length ? `Add ${drafts.length}` : 'Nothing to add'}
            icon="check"
            disabled={drafts.length === 0}
            onPress={confirm}
          />
        </View>
      ) : null}
      {!llmActive && !outcome ? (
        <Text variant="caption" color="textFaint" align="center">
          Parsed on this phone. Works offline.
        </Text>
      ) : null}
    </ScrollView>
  );
}
