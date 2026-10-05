import {
  isValidTimeZone,
  offsetMinutesAt,
  toZonedDate,
  toZonedTime,
  zonedToInstant,
} from '../zonedTime';

const iso = (instant: number) => new Date(instant).toISOString();

describe('zonedTime', () => {
  it('converts wall time to instants in fixed-offset and DST zones', () => {
    expect(iso(zonedToInstant('2026-10-05', '09:00', 'UTC'))).toBe('2026-10-05T09:00:00.000Z');
    expect(iso(zonedToInstant('2026-10-05', '09:00', 'Asia/Kolkata'))).toBe(
      '2026-10-05T03:30:00.000Z',
    );
    expect(iso(zonedToInstant('2026-07-01', '09:00', 'Europe/London'))).toBe(
      '2026-07-01T08:00:00.000Z',
    );
    expect(iso(zonedToInstant('2026-12-01', '09:00', 'Europe/London'))).toBe(
      '2026-12-01T09:00:00.000Z',
    );
  });

  it('keeps a 07:00 chore at 07:00 on both sides of a DST change', () => {
    const before = zonedToInstant('2026-03-28', '07:00', 'Europe/London');
    const after = zonedToInstant('2026-03-29', '07:00', 'Europe/London');
    expect(toZonedTime(before, 'Europe/London')).toBe('07:00');
    expect(toZonedTime(after, 'Europe/London')).toBe('07:00');
    // The day of the change is 23 hours long.
    expect((after - before) / 3_600_000).toBe(23);
  });

  it('moves a time inside the spring-forward gap to just after it', () => {
    // New York skips 02:00-03:00 on 2026-03-08.
    const instant = zonedToInstant('2026-03-08', '02:30', 'America/New_York');
    expect(iso(instant)).toBe('2026-03-08T07:30:00.000Z');
    expect(toZonedTime(instant, 'America/New_York')).toBe('03:30');
  });

  it('picks the earlier instant for a time that happens twice', () => {
    // 01:30 happens twice in New York on 2026-11-01 (EDT, then EST).
    const instant = zonedToInstant('2026-11-01', '01:30', 'America/New_York');
    expect(iso(instant)).toBe('2026-11-01T05:30:00.000Z');
  });

  it('handles southern-hemisphere DST', () => {
    // Sydney moves to daylight time on 2026-10-04.
    expect(offsetMinutesAt(Date.parse('2026-10-03T12:00:00Z'), 'Australia/Sydney')).toBe(600);
    expect(offsetMinutesAt(Date.parse('2026-10-05T12:00:00Z'), 'Australia/Sydney')).toBe(660);
  });

  it('reads the local date and time of an instant', () => {
    const lateEvening = Date.parse('2026-10-05T23:30:00Z');
    expect(toZonedDate(lateEvening, 'Europe/London')).toBe('2026-10-06');
    expect(toZonedDate(lateEvening, 'America/Los_Angeles')).toBe('2026-10-05');
    expect(toZonedTime(lateEvening, 'Asia/Tokyo')).toBe('08:30');
  });

  it('validates zone names', () => {
    expect(isValidTimeZone('Europe/Stockholm')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});
