import {
  formatLocalDate,
  formatLocalTime,
  parseLocalDate,
  parseLocalTime,
  type LocalDate,
  type LocalTime,
} from './localDate';

/**
 * Conversions between instants and wall-clock time in an IANA zone, built on
 * Intl so there is no tz database to ship. Hermes implements the parts of
 * Intl.DateTimeFormat used here on both platforms.
 */

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

function wallClockAt(instant: number, timeZone: string): WallClock {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const part of formatterFor(timeZone).formatToParts(new Date(instant))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year ?? 1970,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    // Some engines still print midnight as 24 under h23.
    hour: (parts.hour ?? 0) % 24,
    minute: parts.minute ?? 0,
  };
}

/** Zone offset from UTC in minutes at a given instant (London in summer: 60). */
export function offsetMinutesAt(instant: number, timeZone: string): number {
  const wall = wallClockAt(instant, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  const truncated = Math.floor(instant / 60_000) * 60_000;
  return Math.round((asUtc - truncated) / 60_000);
}

export function toZonedDate(instant: number, timeZone: string): LocalDate {
  const wall = wallClockAt(instant, timeZone);
  return formatLocalDate(wall.year, wall.month, wall.day);
}

export function toZonedTime(instant: number, timeZone: string): LocalTime {
  const wall = wallClockAt(instant, timeZone);
  return formatLocalTime(wall.hour, wall.minute);
}

/**
 * The instant at which a wall-clock time occurs in a zone.
 *
 * DST makes this a relation, not a function. In a spring-forward gap (02:30
 * in New York on the second Sunday of March never happens) the time is read
 * with the pre-transition offset, which lands it just after the gap: 03:30.
 * In a fall-back overlap (01:30 happens twice) the earlier instant wins, so a
 * reminder never fires an hour late.
 */
export function zonedToInstant(date: LocalDate, time: LocalTime, timeZone: string): number {
  const { year, month, day } = parseLocalDate(date);
  const { hour, minute } = parseLocalTime(time);
  const naive = Date.UTC(year, month - 1, day, hour, minute);

  // Offsets either side of any transition near this date. Transitions are
  // never closer than a few weeks apart, so a day either way is enough.
  const before = offsetMinutesAt(naive - 86_400_000, timeZone);
  const after = offsetMinutesAt(naive + 86_400_000, timeZone);

  const matches = (instant: number) => {
    const wall = wallClockAt(instant, timeZone);
    return (
      wall.year === year &&
      wall.month === month &&
      wall.day === day &&
      wall.hour === hour &&
      wall.minute === minute
    );
  };

  const candidates = [naive - before * 60_000, naive - after * 60_000].filter(matches);
  if (candidates.length > 0) return Math.min(...candidates);
  return naive - before * 60_000;
}
