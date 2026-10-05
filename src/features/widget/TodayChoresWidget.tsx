import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, lineLimit, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import { type TodayWidgetProps } from './lib/todaySnapshot';

/*
 * Runs inside the widget extension, not the app: the 'widget' directive
 * bundles this function on its own, so every constant it needs is declared
 * inside it and all data arrives through props.
 */
const TodayChores = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const ink = dark ? '#EEF2EF' : '#16201D';
  const muted = dark ? '#AEBAB5' : '#56625E';
  const accent = dark ? '#4FC3A1' : '#1F7A63';
  const danger = dark ? '#FF7A61' : '#E0573F';
  const small = environment.widgetFamily === 'systemSmall';
  const rows = (props.chores ?? []).slice(0, small ? 3 : 4);

  return (
    <VStack
      alignment="leading"
      spacing={small ? 4 : 6}
      modifiers={[
        frame({ maxWidth: 9999, maxHeight: 9999, alignment: 'topLeading' }),
        padding({ all: 2 }),
      ]}>
      <HStack spacing={4}>
        <Text
          modifiers={[
            font({ size: 12, weight: 'semibold' }),
            foregroundStyle(accent),
            lineLimit(1),
          ]}>
          {small ? 'Today' : props.householdName}
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 12, weight: 'bold' }),
            foregroundStyle(props.remaining > 0 ? danger : accent),
          ]}>
          {props.remaining > 0 ? `${props.remaining} left` : 'All done'}
        </Text>
      </HStack>
      {small ? null : (
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{props.dateLabel}</Text>
      )}
      {rows.length === 0 ? (
        <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>Nothing due today</Text>
      ) : null}
      {rows.map((row, index) => (
        <HStack key={`${row.title}-${index}`} spacing={6}>
          <Text
            modifiers={[
              font({ size: 12, weight: 'bold' }),
              foregroundStyle(row.done ? accent : row.color),
            ]}>
            {row.done ? '✓' : '●'}
          </Text>
          <Text
            modifiers={[
              font({ size: small ? 12 : 13, weight: row.done ? 'regular' : 'medium' }),
              foregroundStyle(row.done ? muted : row.overdue ? danger : ink),
              lineLimit(1),
            ]}>
            {row.title}
          </Text>
          <Spacer />
          {small ? null : (
            <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>
              {row.who}
            </Text>
          )}
        </HStack>
      ))}
      <Spacer />
    </VStack>
  );
};

export default createWidget<TodayWidgetProps>('TodayChores', TodayChores);
