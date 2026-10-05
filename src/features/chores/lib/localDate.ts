/**
 * Calendar dates and wall-clock times without a time zone, as strings
 * (`2026-10-05`, `07:30`). Chores recur on calendar days, so date arithmetic
 * happens here and only becomes an instant at the edge (see zonedTime.ts).
 * That is what keeps a 7:00 chore at 7:00 across a DST change.
 */

export type LocalDate = string;
export type LocalTime = string;
/** 0 = Sunday ... 6 = Saturday, matching Date#getUTCDay. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MS = 86_400_000;

export function isLocalDate(value: string): value is LocalDate {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isLocalTime(value: string): value is LocalTime {
  return TIME_RE.test(value);
}

export function parseLocalDate(date: LocalDate): { year: number; month: number; day: number } {
  const match = DATE_RE.exec(date);
  if (!match || !isLocalDate(date)) throw new RangeError(`Invalid local date: ${date}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function parseLocalTime(time: LocalTime): { hour: number; minute: number } {
  const match = TIME_RE.exec(time);
  if (!match) throw new RangeError(`Invalid local time: ${time}`);
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

export function formatLocalDate(year: number, month: number, day: number): LocalDate {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function formatLocalTime(hour: number, minute: number): LocalTime {
  return `${pad(hour)}:${pad(minute)}`;
}

/** Days since the Unix epoch. UTC is used purely as a uniform calendar here. */
function toEpochDay(date: LocalDate): number {
  const { year, month, day } = parseLocalDate(date);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function fromEpochDay(epochDay: number): LocalDate {
  const d = new Date(epochDay * DAY_MS);
  return formatLocalDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromEpochDay(toEpochDay(date) + days);
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
  return toEpochDay(to) - toEpochDay(from);
}

export function weekdayOf(date: LocalDate): Weekday {
  return new Date(toEpochDay(date) * DAY_MS).getUTCDay() as Weekday;
}

export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  // ISO dates sort lexicographically, which is why they are stored this way.
  return a < b ? -1 : a > b ? 1 : 0;
}

export function maxLocalDate(a: LocalDate, b: LocalDate): LocalDate {
  return compareLocalDates(a, b) >= 0 ? a : b;
}
