import {
  DAILY,
  decodeRecurrence,
  describeRecurrence,
  encodeRecurrence,
  firstDueDate,
  isOverdue,
  nextDueDate,
  recurrenceSchema,
  type Recurrence,
} from '../recurrence';

describe('nextDueDate', () => {
  it('moves a daily chore to tomorrow when done on time', () => {
    expect(nextDueDate(DAILY, '2026-10-05', '2026-10-05')).toBe('2026-10-06');
  });

  it('does not create a backlog when a daily chore is done late', () => {
    expect(nextDueDate(DAILY, '2026-10-01', '2026-10-05')).toBe('2026-10-06');
  });

  it('keeps every-third-day chores on their grid', () => {
    const rule: Recurrence = { kind: 'daily', interval: 3 };
    expect(nextDueDate(rule, '2026-10-05', '2026-10-05')).toBe('2026-10-08');
    // Done two days late: the next slot on the original grid.
    expect(nextDueDate(rule, '2026-10-05', '2026-10-07')).toBe('2026-10-08');
    expect(nextDueDate(rule, '2026-10-05', '2026-10-08')).toBe('2026-10-11');
  });

  it('keeps weekly chores on their weekday even when done early', () => {
    const weekly: Recurrence = { kind: 'weekly', interval: 1 };
    expect(nextDueDate(weekly, '2026-10-05', '2026-10-03')).toBe('2026-10-12');
    expect(nextDueDate({ kind: 'weekly', interval: 2 }, '2026-10-05', '2026-10-05')).toBe(
      '2026-10-19',
    );
  });

  it('finds the next matching weekday for custom days', () => {
    const binDays: Recurrence = { kind: 'days', days: [1, 4] }; // Mon, Thu
    expect(nextDueDate(binDays, '2026-10-05', '2026-10-05')).toBe('2026-10-08');
    expect(nextDueDate(binDays, '2026-10-08', '2026-10-08')).toBe('2026-10-12');
    // Missed Monday, done on Tuesday: Thursday is next, not Monday again.
    expect(nextDueDate(binDays, '2026-10-05', '2026-10-06')).toBe('2026-10-08');
  });

  it('is unaffected by DST because it works on calendar dates', () => {
    expect(nextDueDate(DAILY, '2026-03-28', '2026-03-28')).toBe('2026-03-29');
    expect(nextDueDate({ kind: 'weekly', interval: 1 }, '2026-10-22', '2026-10-22')).toBe(
      '2026-10-29',
    );
  });
});

describe('firstDueDate', () => {
  it('starts interval rules on the chosen day', () => {
    expect(firstDueDate(DAILY, '2026-10-05')).toBe('2026-10-05');
  });

  it('starts custom-day rules on the first allowed day', () => {
    expect(firstDueDate({ kind: 'days', days: [4] }, '2026-10-05')).toBe('2026-10-08');
    expect(firstDueDate({ kind: 'days', days: [1] }, '2026-10-05')).toBe('2026-10-05');
  });
});

describe('encoding', () => {
  it('round-trips and normalises day order', () => {
    const encoded = encodeRecurrence({ kind: 'days', days: [4, 1, 4] });
    expect(encoded).toBe('{"kind":"days","days":[1,4]}');
    expect(decodeRecurrence(encoded)).toEqual({ kind: 'days', days: [1, 4] });
    expect(decodeRecurrence(encodeRecurrence({ kind: 'weekly', interval: 2 }))).toEqual({
      kind: 'weekly',
      interval: 2,
    });
  });

  it('falls back to daily for malformed cells', () => {
    expect(decodeRecurrence('not json')).toEqual(DAILY);
    expect(decodeRecurrence('{"kind":"hourly"}')).toEqual(DAILY);
    expect(decodeRecurrence('{"kind":"days","days":[]}')).toEqual(DAILY);
  });

  it('rejects out-of-range values in the schema', () => {
    expect(recurrenceSchema.safeParse({ kind: 'daily', interval: 0 }).success).toBe(false);
    expect(recurrenceSchema.safeParse({ kind: 'days', days: [7] }).success).toBe(false);
  });
});

describe('describeRecurrence', () => {
  it.each<[Recurrence, string]>([
    [{ kind: 'daily', interval: 1 }, 'Every day'],
    [{ kind: 'daily', interval: 2 }, 'Every other day'],
    [{ kind: 'daily', interval: 3 }, 'Every 3 days'],
    [{ kind: 'weekly', interval: 1 }, 'Every week'],
    [{ kind: 'weekly', interval: 2 }, 'Every two weeks'],
    [{ kind: 'weekly', interval: 4 }, 'Every 4 weeks'],
    [{ kind: 'days', days: [1, 2, 3, 4, 5] }, 'Weekdays'],
    [{ kind: 'days', days: [0, 6] }, 'Weekends'],
    [{ kind: 'days', days: [0, 1, 2, 3, 4, 5, 6] }, 'Every day'],
    [{ kind: 'days', days: [0, 4, 1] }, 'Mon, Thu, Sun'],
  ])('%j reads as %s', (rule, label) => {
    expect(describeRecurrence(rule)).toBe(label);
  });

  it('flags overdue dates', () => {
    expect(isOverdue('2026-10-04', '2026-10-05')).toBe(true);
    expect(isOverdue('2026-10-05', '2026-10-05')).toBe(false);
  });
});
