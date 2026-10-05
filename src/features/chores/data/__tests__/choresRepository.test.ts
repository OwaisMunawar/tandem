import { isTandemError } from '@/core/errors/TandemError';
import { createDevice } from '@/test-utils/devices';

import { decodeChore } from '../choresRepository';

const context = {
  memberId: 'ngozi',
  timeZone: 'Europe/London',
  activeMemberIds: new Set(['sam', 'linnea', 'ngozi']),
};

const codeOf = (fn: () => unknown) => {
  try {
    fn();
    return null;
  } catch (error) {
    return isTandemError(error) ? error.code : 'other';
  }
};

describe('choresRepository', () => {
  it('adds, reads and sorts chores by due date and time', () => {
    const phone = createDevice('a');
    phone.chores.addChore({
      title: 'Later',
      recurrence: { kind: 'daily', interval: 1 },
      dueDate: '2026-10-06',
    });
    phone.chores.addChore({
      title: 'Evening',
      recurrence: { kind: 'daily', interval: 1 },
      dueDate: '2026-10-05',
      dueTime: '20:00',
    });
    phone.chores.addChore({
      title: 'Morning',
      recurrence: { kind: 'daily', interval: 1 },
      dueDate: '2026-10-05',
      dueTime: '07:00',
    });
    expect(phone.chores.chores().map((chore) => chore.title)).toEqual([
      'Morning',
      'Evening',
      'Later',
    ]);
    expect(phone.chores.chore('missing')).toBeNull();
  });

  it('validates input', () => {
    const phone = createDevice('a');
    const daily = { kind: 'daily', interval: 1 } as const;
    expect(
      codeOf(() => phone.chores.addChore({ title: ' ', recurrence: daily, dueDate: '2026-10-05' })),
    ).toBe('INVALID_INPUT');
    expect(
      codeOf(() => phone.chores.addChore({ title: 'X', recurrence: daily, dueDate: '2026-02-30' })),
    ).toBe('INVALID_INPUT');
    expect(
      codeOf(() =>
        phone.chores.addChore({
          title: 'X',
          recurrence: daily,
          dueDate: '2026-10-05',
          dueTime: '25:00',
        }),
      ),
    ).toBe('INVALID_INPUT');
    expect(codeOf(() => phone.chores.updateChore('missing', { title: 'X' }))).toBe(
      'CHORE_NOT_FOUND',
    );
    expect(codeOf(() => phone.chores.completeChore('missing', context))).toBe('CHORE_NOT_FOUND');
  });

  it('updates only the given fields', () => {
    const phone = createDevice('a');
    const id = phone.chores.addChore({
      title: 'Bins',
      recurrence: { kind: 'weekly', interval: 1 },
      dueDate: '2026-10-05',
    });
    phone.chores.updateChore(id, {
      recurrence: { kind: 'days', days: [1, 4] },
      rotation: ['sam', 'linnea'],
      assigneeId: 'sam',
      dueTime: '19:00',
    });
    phone.chores.updateChore(id, {});
    expect(phone.chores.chore(id)).toMatchObject({
      title: 'Bins',
      recurrence: { kind: 'days', days: [1, 4] },
      rotation: ['sam', 'linnea'],
      assigneeId: 'sam',
      dueTime: '19:00',
    });
  });

  it('completes a chore, rotates it, and can undo', () => {
    const phone = createDevice('a', Date.parse('2026-10-05T19:30:00Z'));
    const id = phone.chores.addChore({
      title: 'Dishes',
      recurrence: { kind: 'daily', interval: 1 },
      dueDate: '2026-10-05',
      assigneeId: 'sam',
      rotation: ['sam', 'linnea', 'ngozi'],
    });
    const result = phone.chores.completeChore(id, context);
    expect(result).toMatchObject({ dueDate: '2026-10-06', assigneeId: 'linnea' });
    expect(phone.chores.chore(id)).toMatchObject({
      dueDate: '2026-10-06',
      assigneeId: 'linnea',
      lastDoneBy: 'ngozi',
    });

    phone.chores.revertCompletion(result.previous);
    expect(phone.chores.chore(id)).toMatchObject({
      dueDate: '2026-10-05',
      assigneeId: 'sam',
      lastDoneBy: '',
    });
  });

  it('deletes and restores with the original timing', () => {
    const phone = createDevice('a');
    const id = phone.chores.addChore({
      title: 'Plants',
      recurrence: { kind: 'daily', interval: 3 },
      dueDate: '2026-10-07',
      dueTime: '08:00',
    });
    const removed = phone.chores.deleteChore(id);
    expect(phone.chores.chore(id)).toBeNull();
    phone.chores.revertCompletion(removed);
    expect(phone.chores.chore(id)).toBeNull();
    phone.chores.restoreChore(removed);
    expect(phone.chores.chore(id)).toMatchObject({
      title: 'Plants',
      dueDate: '2026-10-07',
      dueTime: '08:00',
      recurrence: { kind: 'daily', interval: 3 },
    });
  });

  it('decodes rows defensively', () => {
    const chore = decodeChore('c', {
      title: 'X',
      assigneeId: '',
      rotation: 'garbage',
      recurrence: 'garbage',
      dueDate: '2026-10-05',
      dueTime: '9am',
      createdAt: 0,
      lastDoneAt: 0,
      lastDoneBy: '',
    });
    expect(chore).toMatchObject({
      rotation: [],
      recurrence: { kind: 'daily', interval: 1 },
      dueTime: '09:00',
    });
  });
});
