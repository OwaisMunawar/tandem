import { dueLabel } from '../dueLabel';
import { quickDates } from '../quickDates';
import { bucketFor, dueInstant, planCompletion, type ChoreTiming } from '../schedule';

const members = new Set(['ngozi', 'linnea', 'sam']);

const dishes: ChoreTiming = {
  dueDate: '2026-10-05',
  dueTime: '20:00',
  recurrence: { kind: 'daily', interval: 1 },
  assigneeId: 'sam',
  rotation: ['sam', 'linnea', 'ngozi'],
};

describe('planCompletion', () => {
  it('schedules the next occurrence and rotates the assignee', () => {
    const plan = planCompletion(
      dishes,
      Date.parse('2026-10-05T19:00:00Z'),
      'Europe/London',
      members,
    );
    expect(plan).toEqual({
      dueDate: '2026-10-06',
      assigneeId: 'linnea',
      doneAt: Date.parse('2026-10-05T19:00:00Z'),
    });
  });

  it('uses the household zone to decide which day the chore was done', () => {
    // 23:30 UTC on the 5th is already the 6th in Stockholm, the 5th in New York.
    const late = Date.parse('2026-10-05T23:30:00Z');
    expect(planCompletion(dishes, late, 'Europe/Stockholm', members).dueDate).toBe('2026-10-07');
    expect(planCompletion(dishes, late, 'America/New_York', members).dueDate).toBe('2026-10-06');
  });

  it('keeps the assignee when there is no rotation', () => {
    const plan = planCompletion(
      { ...dishes, rotation: [] },
      Date.parse('2026-10-05T19:00:00Z'),
      'UTC',
      members,
    );
    expect(plan.assigneeId).toBe('sam');
  });
});

describe('scheduling helpers', () => {
  it('buckets by calendar day', () => {
    expect(bucketFor('2026-10-04', '2026-10-05')).toBe('overdue');
    expect(bucketFor('2026-10-05', '2026-10-05')).toBe('today');
    expect(bucketFor('2026-10-06', '2026-10-05')).toBe('upcoming');
  });

  it('computes the due instant in the household zone', () => {
    expect(new Date(dueInstant(dishes, 'Europe/London')).toISOString()).toBe(
      '2026-10-05T19:00:00.000Z',
    );
  });

  it('labels due dates for humans', () => {
    expect(dueLabel('2026-10-04', null, '2026-10-05')).toEqual({
      label: 'Yesterday',
      tone: 'overdue',
    });
    expect(dueLabel('2026-10-02', null, '2026-10-05')).toEqual({
      label: '3 days late',
      tone: 'overdue',
    });
    expect(dueLabel('2026-10-05', '20:00', '2026-10-05')).toEqual({
      label: 'Today 20:00',
      tone: 'today',
    });
    expect(dueLabel('2026-10-06', null, '2026-10-05')).toEqual({ label: 'Tomorrow', tone: 'soon' });
    expect(dueLabel('2026-10-09', '09:00', '2026-10-05')).toEqual({
      label: 'Fri 09:00',
      tone: 'soon',
    });
    expect(dueLabel('2026-10-20', null, '2026-10-05')).toEqual({ label: '20 Oct', tone: 'later' });
  });

  it('offers quick dates relative to today', () => {
    expect(quickDates('2026-10-05').map((option) => option.date)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-10',
      '2026-10-12',
    ]);
    // On a Saturday, "Saturday" means next week's, and Monday is two days away.
    expect(quickDates('2026-10-10').map((option) => option.date)).toEqual([
      '2026-10-10',
      '2026-10-11',
      '2026-10-17',
      '2026-10-12',
    ]);
  });
});
