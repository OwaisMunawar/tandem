import { z } from 'zod';

import {
  addDays,
  compareLocalDates,
  daysBetween,
  maxLocalDate,
  weekdayOf,
  type LocalDate,
  type Weekday,
} from './localDate';

/**
 * How a chore repeats. Kept deliberately small: these three shapes cover
 * every household routine we tested against, and each one has an obvious
 * answer to "when is it due next?".
 */
const weekday = z.literal([0, 1, 2, 3, 4, 5, 6]);

export const recurrenceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('daily'), interval: z.number().int().min(1).max(365) }),
  z.object({ kind: z.literal('weekly'), interval: z.number().int().min(1).max(52) }),
  z.object({ kind: z.literal('days'), days: z.array(weekday).min(1).max(7) }),
]);

export type Recurrence = z.infer<typeof recurrenceSchema>;

export const DAILY: Recurrence = { kind: 'daily', interval: 1 };

/** Recurrence is one CRDT cell, so a concurrent edit replaces it whole. */
export function encodeRecurrence(rule: Recurrence): string {
  if (rule.kind === 'days') {
    return JSON.stringify({ kind: 'days', days: [...new Set(rule.days)].sort() });
  }
  return JSON.stringify(rule);
}

/** Falls back to daily: a malformed cell from an older client must not crash the list. */
export function decodeRecurrence(encoded: string): Recurrence {
  try {
    const parsed = recurrenceSchema.safeParse(JSON.parse(encoded));
    return parsed.success ? parsed.data : DAILY;
  } catch {
    return DAILY;
  }
}

/** Smallest multiple of `step` days after `start` that is strictly later than `after`. */
function nextOnGrid(start: LocalDate, step: number, after: LocalDate): LocalDate {
  const gap = daysBetween(start, after);
  const steps = gap < 0 ? 1 : Math.floor(gap / step) + 1;
  return addDays(start, steps * step);
}

/**
 * The next due date once a chore is done.
 *
 * Counting starts from whichever is later, the due date or the day it was
 * actually done. Finishing a daily chore three days late schedules it for
 * tomorrow rather than creating a backlog of missed days, and finishing a
 * weekly chore early keeps it on its usual weekday.
 */
export function nextDueDate(rule: Recurrence, dueDate: LocalDate, doneOn: LocalDate): LocalDate {
  const anchor = maxLocalDate(dueDate, doneOn);
  switch (rule.kind) {
    case 'daily':
      return nextOnGrid(dueDate, rule.interval, anchor);
    case 'weekly':
      return nextOnGrid(dueDate, rule.interval * 7, anchor);
    case 'days': {
      const days = new Set<Weekday>(rule.days);
      for (let offset = 1; offset <= 7; offset += 1) {
        const candidate = addDays(anchor, offset);
        if (days.has(weekdayOf(candidate))) return candidate;
      }
      /* istanbul ignore next -- the schema guarantees at least one weekday */
      return addDays(anchor, 1);
    }
  }
}

/** First date on or after `from` the rule allows, used when a chore is created. */
export function firstDueDate(rule: Recurrence, from: LocalDate): LocalDate {
  if (rule.kind !== 'days') return from;
  const days = new Set<Weekday>(rule.days);
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = addDays(from, offset);
    if (days.has(weekdayOf(candidate))) return candidate;
  }
  /* istanbul ignore next -- the schema guarantees at least one weekday */
  return from;
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function describeRecurrence(rule: Recurrence): string {
  switch (rule.kind) {
    case 'daily':
      return rule.interval === 1
        ? 'Every day'
        : rule.interval === 2
          ? 'Every other day'
          : `Every ${rule.interval} days`;
    case 'weekly':
      return rule.interval === 1
        ? 'Every week'
        : rule.interval === 2
          ? 'Every two weeks'
          : `Every ${rule.interval} weeks`;
    case 'days': {
      const sorted = [...new Set(rule.days)].sort();
      if (sorted.length === 7) return 'Every day';
      if (sorted.join() === '1,2,3,4,5') return 'Weekdays';
      if (sorted.join() === '0,6') return 'Weekends';
      // Week starts on Monday in the label, which is how people say it.
      const mondayFirst = [...sorted.filter((d) => d !== 0), ...sorted.filter((d) => d === 0)];
      return mondayFirst.map((d) => SHORT_DAYS[d]).join(', ');
    }
  }
}

export function isOverdue(dueDate: LocalDate, today: LocalDate): boolean {
  return compareLocalDates(dueDate, today) < 0;
}
