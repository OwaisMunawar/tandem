import { type Chore } from '@/features/chores/lib/chore';
import { type Member } from '@/features/households/lib/members';

import { buildTodaySnapshot } from '../todaySnapshot';

const members = new Map<string, Member>([
  ['sam', { id: 'sam', name: 'Sam Reyes', color: '#3A78C9', joinedAt: 0, leftAt: 0 }],
  ['linnea', { id: 'linnea', name: 'Linnea Lindqvist', color: '#E0573F', joinedAt: 0, leftAt: 0 }],
]);

const chore = (patch: Partial<Chore>): Chore => ({
  id: 'c',
  title: 'Chore',
  assigneeId: '',
  rotation: [],
  recurrence: { kind: 'daily', interval: 1 },
  dueDate: '2026-10-05',
  dueTime: '09:00',
  createdAt: 0,
  lastDoneAt: 0,
  lastDoneBy: '',
  ...patch,
});

describe('buildTodaySnapshot', () => {
  it('lists overdue and due chores first, then what was done today', () => {
    const snapshot = buildTodaySnapshot({
      householdName: 'Flat',
      members,
      today: '2026-10-05',
      timeZone: 'Europe/London',
      chores: [
        chore({ title: 'Dishes', assigneeId: 'sam', dueTime: '20:00' }),
        chore({ title: 'Bins', assigneeId: 'linnea', dueDate: '2026-10-04' }),
        chore({
          title: 'Hoover',
          dueDate: '2026-10-12',
          lastDoneAt: Date.parse('2026-10-05T08:00:00Z'),
          lastDoneBy: 'linnea',
        }),
        chore({ title: 'Plants', dueDate: '2026-10-08' }),
        chore({ title: 'Undated', dueDate: '' }),
      ],
    });
    expect(snapshot.dateLabel).toBe('Monday 5 Oct');
    expect(snapshot.remaining).toBe(2);
    expect(snapshot.chores).toEqual([
      { title: 'Bins', who: 'Linnea', color: '#E0573F', time: '09:00', overdue: true, done: false },
      { title: 'Dishes', who: 'Sam', color: '#3A78C9', time: '20:00', overdue: false, done: false },
      {
        title: 'Hoover',
        who: 'Linnea',
        color: '#E0573F',
        time: '09:00',
        overdue: false,
        done: true,
      },
    ]);
  });

  it('says "Anyone" for unassigned chores and respects the limit', () => {
    const chores = Array.from({ length: 10 }, (_, index) =>
      chore({ id: `c${index}`, title: `C${index}` }),
    );
    const snapshot = buildTodaySnapshot({
      householdName: 'Flat',
      members,
      today: '2026-10-05',
      timeZone: 'UTC',
      chores,
      limit: 3,
    });
    expect(snapshot.chores).toHaveLength(3);
    expect(snapshot.chores[0]?.who).toBe('Anyone');
    expect(snapshot.remaining).toBe(10);
  });
});
