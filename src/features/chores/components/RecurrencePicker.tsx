import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Chip, SegmentedControl } from '@/core/ui';

import { type Weekday } from '../lib/localDate';
import { type Recurrence } from '../lib/recurrence';

const DAY_CHIPS: { day: Weekday; label: string }[] = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

const KIND_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'days', label: 'Custom days' },
] as const;

export function RecurrencePicker({
  value,
  onChange,
  defaultWeekday,
}: {
  value: Recurrence;
  onChange: (rule: Recurrence) => void;
  /** Seeds "Custom days" with the weekday the chore is due on. */
  defaultWeekday: Weekday;
}) {
  const { spacing } = useTheme();

  const switchKind = (kind: Recurrence['kind']) => {
    if (kind === value.kind) return;
    if (kind === 'days') onChange({ kind, days: [defaultWeekday] });
    else onChange({ kind, interval: 1 });
  };

  return (
    <View style={{ gap: spacing.md }}>
      <SegmentedControl
        testID="recurrence-kind"
        options={KIND_OPTIONS}
        value={value.kind}
        onChange={switchKind}
      />
      {value.kind === 'days' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {DAY_CHIPS.map(({ day, label }) => {
            const selected = value.days.includes(day);
            return (
              <Chip
                key={day}
                testID={`day-${day}`}
                label={label}
                selected={selected}
                onPress={() => {
                  const days = selected
                    ? value.days.filter((d) => d !== day)
                    : [...value.days, day];
                  // An empty set has no next occurrence; keep at least one day.
                  if (days.length > 0) onChange({ kind: 'days', days });
                }}
              />
            );
          })}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {(value.kind === 'daily' ? [1, 2, 3, 7] : [1, 2, 4]).map((interval) => (
            <Chip
              key={interval}
              label={
                interval === 1
                  ? value.kind === 'daily'
                    ? 'Every day'
                    : 'Every week'
                  : `Every ${interval} ${value.kind === 'daily' ? 'days' : 'weeks'}`
              }
              selected={value.interval === interval}
              onPress={() => onChange({ kind: value.kind, interval })}
            />
          ))}
        </View>
      )}
    </View>
  );
}
