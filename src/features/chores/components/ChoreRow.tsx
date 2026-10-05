import { memo } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useTheme } from '@/core/theme';
import { Avatar, Icon, ScalePressable, Text } from '@/core/ui';
import { firstName, type Member } from '@/features/households/lib/members';
import { EditingBadge } from '@/features/sync/components/EditingBadge';

import { type Chore } from '../lib/chore';
import { dueLabel } from '../lib/dueLabel';
import { describeRecurrence } from '../lib/recurrence';
import { nextAssignee } from '../lib/rotation';
import { toZonedDate } from '../lib/zonedTime';

type Props = {
  chore: Chore;
  members: Map<string, Member>;
  activeIds: ReadonlySet<string>;
  today: string;
  timeZone: string;
  onComplete: (chore: Chore) => void;
  onOpen: (chore: Chore) => void;
};

export const ChoreRow = memo(function ChoreRow({
  chore,
  members,
  activeIds,
  today,
  timeZone,
  onComplete,
  onOpen,
}: Props) {
  const { colors, radii, spacing } = useTheme();
  const assignee = members.get(chore.assigneeId);
  const due = dueLabel(chore.dueDate, chore.dueTime, today);
  const rotating = chore.rotation.length > 1;
  const next = rotating
    ? members.get(nextAssignee(chore.rotation, chore.assigneeId, activeIds))
    : undefined;
  const doneToday = chore.lastDoneAt > 0 && toZonedDate(chore.lastDoneAt, timeZone) === today;
  const doneBy = members.get(chore.lastDoneBy);

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.springify().damping(20)}>
      <ScalePressable
        testID={`chore-${chore.id}`}
        pressedScale={0.99}
        onPress={() => onOpen(chore)}
        accessibilityRole="button"
        accessibilityLabel={`${chore.title}, ${due.label}${assignee ? `, ${assignee.name}` : ''}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radii.md,
          backgroundColor: colors.surface,
        }}>
        <ScalePressable
          testID={`complete-${chore.id}`}
          hitSlop={10}
          pressedScale={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${chore.title} done`}
          onPress={() => onComplete(chore)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            borderWidth: 2,
            borderColor: due.tone === 'overdue' ? colors.danger : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon
            name="check"
            size={16}
            color={due.tone === 'overdue' ? colors.danger : colors.textFaint}
          />
        </ScalePressable>
        <View style={{ flex: 1, gap: 3 }}>
          <Text numberOfLines={1}>{chore.title}</Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              flexWrap: 'wrap',
            }}>
            <Text
              variant="caption"
              style={{
                color:
                  due.tone === 'overdue'
                    ? colors.danger
                    : due.tone === 'today'
                      ? colors.warning
                      : colors.textMuted,
              }}>
              {due.label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="repeat" size={11} color={colors.textFaint} />
              <Text variant="caption" color="textFaint">
                {describeRecurrence(chore.recurrence)}
              </Text>
            </View>
            {next ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Icon name="rotate" size={11} color={colors.textFaint} />
                <Text variant="caption" color="textFaint">
                  then {firstName(next.name)}
                </Text>
              </View>
            ) : null}
          </View>
          {doneToday && doneBy ? (
            <Text variant="caption" color="success">
              Done today by {firstName(doneBy.name)}
            </Text>
          ) : null}
          <EditingBadge targetId={chore.id} />
        </View>
        {assignee ? (
          <Avatar name={assignee.name} color={assignee.color} size={30} />
        ) : (
          <Text variant="caption" color="textFaint">
            Anyone
          </Text>
        )}
      </ScalePressable>
    </Animated.View>
  );
});
