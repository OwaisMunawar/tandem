import { type Chore } from '../../chores/lib/chore';
import {
  compareLocalDates,
  parseLocalDate,
  weekdayOf,
  type LocalDate,
} from '../../chores/lib/localDate';
import { toZonedDate } from '../../chores/lib/zonedTime';
import { type Member } from '../../households/lib/members';

export type WidgetChore = {
  title: string;
  who: string;
  color: string;
  time: string;
  overdue: boolean;
  done: boolean;
};

/** Plain JSON only: this crosses into the widget extension's own JS runtime. */
export type TodayWidgetProps = {
  householdName: string;
  dateLabel: string;
  chores: WidgetChore[];
  remaining: number;
};

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * What the home-screen widget shows: everything due today or overdue, then
 * what was already done today, so the widget reads as a checklist for the day.
 */
export function buildTodaySnapshot(input: {
  householdName: string;
  chores: readonly Chore[];
  members: ReadonlyMap<string, Member>;
  today: LocalDate;
  timeZone: string;
  limit?: number;
}): TodayWidgetProps {
  const { today, timeZone, members } = input;
  const toRow = (chore: Chore, done: boolean): WidgetChore => {
    const member = members.get(done ? chore.lastDoneBy : chore.assigneeId);
    return {
      title: chore.title,
      who: member ? (member.name.split(' ')[0] ?? member.name) : 'Anyone',
      color: member?.color ?? '#8C9692',
      time: chore.dueTime,
      overdue: !done && compareLocalDates(chore.dueDate, today) < 0,
      done,
    };
  };

  const due = input.chores
    .filter((chore) => chore.dueDate && compareLocalDates(chore.dueDate, today) <= 0)
    .sort((a, b) => compareLocalDates(a.dueDate, b.dueDate) || a.dueTime.localeCompare(b.dueTime))
    .map((chore) => toRow(chore, false));
  const done = input.chores
    .filter((chore) => chore.lastDoneAt > 0 && toZonedDate(chore.lastDoneAt, timeZone) === today)
    .sort((a, b) => b.lastDoneAt - a.lastDoneAt)
    .map((chore) => toRow(chore, true));

  const { month, day } = parseLocalDate(today);
  return {
    householdName: input.householdName,
    dateLabel: `${WEEKDAYS[weekdayOf(today)]} ${day} ${MONTHS[month - 1]}`,
    chores: [...due, ...done].slice(0, input.limit ?? 6),
    remaining: due.length,
  };
}
