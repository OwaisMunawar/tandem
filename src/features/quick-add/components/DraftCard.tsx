import { View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useTheme } from '@/core/theme';
import { Icon, IconButton, Text, type IconName } from '@/core/ui';
import { dueLabel } from '@/features/chores/lib/dueLabel';
import { describeRecurrence } from '@/features/chores/lib/recurrence';
import { firstName, type Member } from '@/features/households/lib/members';
import { CATEGORY_LABELS } from '@/features/lists/lib/categories';

import { type QuickAddDraft } from '../lib/contract';

const KIND: Record<QuickAddDraft['kind'], { icon: IconName; label: string }> = {
  grocery: { icon: 'cart', label: 'Grocery' },
  todo: { icon: 'checklist', label: 'To-do' },
  chore: { icon: 'chores', label: 'Chore' },
};

export function DraftCard({
  draft,
  index,
  members,
  today,
  onRemove,
}: {
  draft: QuickAddDraft;
  index: number;
  members: Map<string, Member>;
  today: string;
  onRemove: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const assignee = draft.assigneeId ? members.get(draft.assigneeId) : undefined;
  const details = [
    draft.kind === 'chore' ? null : CATEGORY_LABELS[draft.category],
    draft.quantity || null,
    draft.recurrence ? describeRecurrence(draft.recurrence) : null,
    draft.dueDate ? dueLabel(draft.dueDate, draft.dueTime, today).label : null,
    draft.rotation.length > 1
      ? `Turns: ${draft.rotation.map((id) => firstName(members.get(id)?.name ?? '?')).join(' → ')}`
      : assignee
        ? firstName(assignee.name)
        : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 45)
        .springify()
        .damping(18)}
      exiting={FadeOut}
      layout={LinearTransition}
      testID={`draft-${index}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={KIND[draft.kind].icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
            {draft.title}
          </Text>
          <Text variant="overline" color="textFaint">
            {KIND[draft.kind].label}
          </Text>
        </View>
        <Text variant="caption" color="textMuted" numberOfLines={2}>
          {details.join(' · ')}
        </Text>
      </View>
      <IconButton
        icon="close"
        label={`Remove ${draft.title}`}
        size={32}
        tone="textFaint"
        onPress={onRemove}
      />
    </Animated.View>
  );
}
