import {
  addDays,
  compareLocalDates,
  daysBetween,
  formatLocalTime,
  isLocalDate,
  isLocalTime,
  maxLocalDate,
  parseLocalDate,
  parseLocalTime,
  weekdayOf,
} from '../localDate';

describe('localDate', () => {
  it('validates real calendar dates only', () => {
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2026-13-01')).toBe(false);
    expect(isLocalDate('26-1-1')).toBe(false);
  });

  it('validates 24h wall-clock times', () => {
    expect(isLocalTime('00:00')).toBe(true);
    expect(isLocalTime('23:59')).toBe(true);
    expect(isLocalTime('24:00')).toBe(false);
    expect(isLocalTime('7:00')).toBe(false);
  });

  it('parses and rejects', () => {
    expect(parseLocalDate('2026-10-05')).toEqual({ year: 2026, month: 10, day: 5 });
    expect(() => parseLocalDate('2026-02-30')).toThrow(RangeError);
    expect(parseLocalTime('07:30')).toEqual({ hour: 7, minute: 30 });
    expect(() => parseLocalTime('7.30')).toThrow(RangeError);
    expect(formatLocalTime(7, 5)).toBe('07:05');
  });

  it('adds days across month, year and leap boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts whole days regardless of DST, because no zone is involved', () => {
    // Europe/London springs forward on 2026-03-29; the calendar does not care.
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-05', '2026-10-01')).toBe(-4);
  });

  it('knows weekdays and orders dates', () => {
    expect(weekdayOf('2026-10-05')).toBe(1); // Monday
    expect(weekdayOf('2026-10-11')).toBe(0); // Sunday
    expect(compareLocalDates('2026-10-05', '2026-10-06')).toBe(-1);
    expect(compareLocalDates('2026-10-06', '2026-10-05')).toBe(1);
    expect(compareLocalDates('2026-10-05', '2026-10-05')).toBe(0);
    expect(maxLocalDate('2026-10-05', '2026-09-30')).toBe('2026-10-05');
    expect(maxLocalDate('2026-09-30', '2026-10-05')).toBe('2026-10-05');
  });
});
