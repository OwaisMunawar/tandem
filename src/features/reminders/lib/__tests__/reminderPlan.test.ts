import { type Chore } from '@/features/chores/lib/chore';
import { type Item } from '@/features/lists/lib/items';

import { syncReminders, type NotificationPort } from '../../data/reminderScheduler';
import { diffReminders, planReminders, type Reminder } from '../reminderPlan';

const now = Date.parse('2026-10-05T09:00:00Z');

const chore = (patch: Partial<Chore>): Chore => ({
  id: 'c',
  title: 'Dishes',
  assigneeId: '',
  rotation: [],
  recurrence: { kind: 'daily', interval: 1 },
  dueDate: '2026-10-05',
  dueTime: '20:00',
  createdAt: 0,
  lastDoneAt: 0,
  lastDoneBy: '',
  ...patch,
});

const item = (patch: Partial<Item>): Item => ({
  id: 'i',
  listId: 'todos',
  title: 'Pay rent',
  category: 'bills',
  quantity: '',
  note: '',
  done: false,
  assigneeId: '',
  dueAt: now + 3_600_000,
  position: 0,
  createdAt: 0,
  createdBy: '',
  completedAt: 0,
  ...patch,
});

describe('planReminders', () => {
  const plan = (chores: Chore[], items: Item[]) =>
    planReminders({
      chores,
      items,
      memberId: 'ngozi',
      timeZone: 'Europe/London',
      now,
      householdName: 'Flat',
    });

  it('schedules my chores and unassigned ones, not other people’s', () => {
    const reminders = plan(
      [
        chore({ id: 'mine', assigneeId: 'ngozi' }),
        chore({ id: 'anyone' }),
        chore({ id: 'sams', assigneeId: 'sam' }),
      ],
      [],
    );
    expect(reminders.map((r) => r.id)).toEqual([
      'chore:anyone:2026-10-05:20:00',
      'chore:mine:2026-10-05:20:00',
    ]);
    expect(reminders[0]).toMatchObject({
      at: Date.parse('2026-10-05T19:00:00Z'),
      body: 'Anyone free? · Flat',
    });
    expect(reminders[1]?.body).toBe('Your turn · Flat');
  });

  it('skips past, far-future, done and undated items', () => {
    const reminders = plan(
      [
        chore({ id: 'past', dueDate: '2026-10-04' }),
        chore({ id: 'far', dueDate: '2026-11-30' }),
        chore({ id: 'nodate', dueDate: '' }),
      ],
      [
        item({ id: 'due' }),
        item({ id: 'done', done: true }),
        item({ id: 'undated', dueAt: 0 }),
        item({ id: 'old', dueAt: now - 1 }),
        item({ id: 'far', dueAt: now + 30 * 86_400_000 }),
        item({ id: 'sam', assigneeId: 'sam' }),
      ],
    );
    expect(reminders.map((r) => r.id)).toEqual([`item:due:${now + 3_600_000}`]);
  });

  it('caps pending notifications under the iOS limit', () => {
    const many = Array.from({ length: 80 }, (_, index) =>
      item({ id: `i${index}`, dueAt: now + (index + 1) * 60_000 }),
    );
    expect(plan([], many)).toHaveLength(60);
  });
});

describe('reminder sync', () => {
  it('cancels what is no longer wanted and schedules only what is new', async () => {
    const desired: Reminder[] = [
      { id: 'keep', at: 1, title: 'a', body: 'b' },
      { id: 'new', at: 2, title: 'a', body: 'b' },
    ];
    expect(diffReminders(['keep', 'stale'], desired)).toEqual({
      cancel: ['stale'],
      schedule: [desired[1]],
    });

    const scheduled = new Set(['keep', 'stale']);
    const port: NotificationPort = {
      scheduledIds: async () => [...scheduled],
      schedule: async (reminder) => void scheduled.add(reminder.id),
      cancel: async (id) => void scheduled.delete(id),
    };
    expect(await syncReminders(port, desired)).toEqual({ cancelled: 1, scheduled: 1 });
    expect([...scheduled].sort()).toEqual(['keep', 'new']);
  });
});
