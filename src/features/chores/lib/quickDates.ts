import { addDays, weekdayOf, type LocalDate } from './localDate';

export type QuickDate = { key: string; label: string; date: LocalDate };

/** The handful of dates people actually pick, so editors need no date picker. */
export function quickDates(today: LocalDate): QuickDate[] {
  const weekday = weekdayOf(today);
  const toSaturday = (6 - weekday + 7) % 7 || 7;
  const toMonday = (1 - weekday + 7) % 7 || 7;
  return [
    { key: 'today', label: 'Today', date: today },
    { key: 'tomorrow', label: 'Tomorrow', date: addDays(today, 1) },
    { key: 'weekend', label: 'Saturday', date: addDays(today, toSaturday) },
    { key: 'next-week', label: 'Next Monday', date: addDays(today, toMonday) },
  ];
}
