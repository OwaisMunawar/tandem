import {
  daysBetween,
  parseLocalDate,
  weekdayOf,
  type LocalDate,
  type LocalTime,
} from './localDate';

export type DueTone = 'overdue' | 'today' | 'soon' | 'later';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
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

/** Short human due labels: "Today 20:00", "Tomorrow", "Fri", "12 Oct", "2 days late". */
export function dueLabel(
  dueDate: LocalDate,
  dueTime: LocalTime | null,
  today: LocalDate,
): { label: string; tone: DueTone } {
  const delta = daysBetween(today, dueDate);
  const at = dueTime ? ` ${dueTime}` : '';
  if (delta < 0) {
    return { label: delta === -1 ? 'Yesterday' : `${-delta} days late`, tone: 'overdue' };
  }
  if (delta === 0) return { label: `Today${at}`, tone: 'today' };
  if (delta === 1) return { label: `Tomorrow${at}`, tone: 'soon' };
  if (delta < 7) return { label: `${WEEKDAYS[weekdayOf(dueDate)]}${at}`, tone: 'soon' };
  const { month, day } = parseLocalDate(dueDate);
  return { label: `${day} ${MONTHS[month - 1]}`, tone: 'later' };
}
