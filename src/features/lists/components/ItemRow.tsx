import * as Haptics from 'expo-haptics';
import { memo, useRef } from 'react';
import { View } from 'react-native';
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  LinearTransition,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme, type ColorRoles } from '@/core/theme';
import { Avatar, Icon, ScalePressable, Text, type IconName } from '@/core/ui';
import { dueLabel } from '@/features/chores/lib/dueLabel';
import { toZonedDate, toZonedTime } from '@/features/chores/lib/zonedTime';
import { type Member } from '@/features/households/lib/members';
import { EditingBadge } from '@/features/sync/components/EditingBadge';

import { type Item } from '../lib/items';

const ACTION_WIDTH = 88;

type Props = {
  item: Item;
  assignee?: Member;
  today: string;
  timeZone: string;
  onToggle: (item: Item) => void;
  onDelete: (item: Item) => void;
  onOpen: (item: Item) => void;
  onMove: (item: Item, direction: -1 | 1) => void;
};

/**
 * Swipe right to tick, left to delete. Both commit on release past the
 * threshold; undo lives in the toast so there is no confirmation step.
 * Layout animations run on the UI thread, so a remote change sliding an item
 * into "Done" animates the same way a local tap does.
 */
export const ItemRow = memo(function ItemRow({
  item,
  assignee,
  today,
  timeZone,
  onToggle,
  onDelete,
  onOpen,
  onMove,
}: Props) {
  const { colors, radii, spacing } = useTheme();
  const swipeable = useRef<SwipeableMethods>(null);
  const due = item.dueAt
    ? dueLabel(toZonedDate(item.dueAt, timeZone), toZonedTime(item.dueAt, timeZone), today)
    : null;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.springify().damping(20)}>
      <ReanimatedSwipeable
        ref={swipeable}
        testID={`swipe-${item.id}`}
        friction={1.6}
        leftThreshold={ACTION_WIDTH * 0.7}
        rightThreshold={ACTION_WIDTH * 0.7}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableOpen={(direction) => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (direction === SwipeDirection.RIGHT) onToggle(item);
          else onDelete(item);
          swipeable.current?.close();
        }}
        renderLeftActions={(progress) => (
          <SwipeAction
            progress={progress}
            icon={item.done ? 'circle' : 'check'}
            label={item.done ? 'Undo' : 'Done'}
            fg="success"
            bg="successSoft"
          />
        )}
        renderRightActions={(progress) => (
          <SwipeAction
            progress={progress}
            icon="trash"
            label="Delete"
            fg="danger"
            bg="dangerSoft"
          />
        )}>
        <ScalePressable
          testID={`item-${item.id}`}
          pressedScale={0.99}
          onPress={() => onOpen(item)}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}${item.quantity ? `, ${item.quantity}` : ''}${item.done ? ', done' : ''}`}
          accessibilityHint="Opens the item. Swipe right to tick, left to delete."
          accessibilityActions={[
            { name: 'activate' },
            { name: 'toggle', label: item.done ? 'Mark not done' : 'Mark done' },
            { name: 'delete', label: 'Delete' },
            { name: 'moveUp', label: 'Move up' },
            { name: 'moveDown', label: 'Move down' },
          ]}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === 'toggle') onToggle(item);
            if (nativeEvent.actionName === 'delete') onDelete(item);
            if (nativeEvent.actionName === 'moveUp') onMove(item, -1);
            if (nativeEvent.actionName === 'moveDown') onMove(item, 1);
            if (nativeEvent.actionName === 'activate') onOpen(item);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            backgroundColor: colors.surface,
            borderRadius: radii.md,
          }}>
          <ScalePressable
            testID={`toggle-${item.id}`}
            hitSlop={10}
            pressedScale={0.85}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.done }}
            accessibilityLabel={
              item.done ? `Mark ${item.title} not done` : `Mark ${item.title} done`
            }
            onPress={() => {
              void Haptics.selectionAsync();
              onToggle(item);
            }}>
            <Icon
              name={item.done ? 'checkCircle' : 'circle'}
              size={24}
              color={item.done ? colors.success : colors.textFaint}
            />
          </ScalePressable>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
              <Text
                numberOfLines={1}
                style={{
                  flexShrink: 1,
                  textDecorationLine: item.done ? 'line-through' : 'none',
                  color: item.done ? colors.textFaint : colors.text,
                }}>
                {item.title}
              </Text>
              {item.quantity ? (
                <Text variant="caption" color="textMuted" tabular>
                  {item.quantity}
                </Text>
              ) : null}
            </View>
            {(due && !item.done) || item.note ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                {due && !item.done ? (
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
                ) : null}
                {item.note ? (
                  <Text
                    variant="caption"
                    color="textFaint"
                    numberOfLines={1}
                    style={{ flexShrink: 1 }}>
                    {item.note}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <EditingBadge targetId={item.id} />
          </View>
          {assignee ? <Avatar name={assignee.name} color={assignee.color} size={26} /> : null}
        </ScalePressable>
      </ReanimatedSwipeable>
    </Animated.View>
  );
});

function SwipeAction({
  progress,
  icon,
  label,
  fg,
  bg,
}: {
  progress: SharedValue<number>;
  icon: IconName;
  label: string;
  fg: keyof ColorRoles;
  bg: keyof ColorRoles;
}) {
  const { colors, radii, spacing } = useTheme();
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.5, 1], [0, 0.6, 1]),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.7, 1], 'clamp') }],
  }));
  return (
    <View style={{ width: ACTION_WIDTH, padding: spacing.xs }}>
      <Animated.View
        style={[
          {
            flex: 1,
            borderRadius: radii.md,
            backgroundColor: colors[bg],
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          },
          style,
        ]}>
        <Icon name={icon} size={18} color={colors[fg]} />
        <Text variant="caption" style={{ color: colors[fg] }}>
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}
