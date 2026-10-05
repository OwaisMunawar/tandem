import { isTandemError } from '@/core/errors/TandemError';
import { createDevice } from '@/test-utils/devices';

describe('householdRepository', () => {
  it('initialises a household with its founder and default lists', () => {
    const phone = createDevice('a');
    const { founderId } = phone.household.initialise({
      name: '  ',
      timeZone: 'Europe/Stockholm',
      founderName: '',
    });
    expect(phone.store.getValues()).toMatchObject({
      householdName: 'Our home',
      timeZone: 'Europe/Stockholm',
    });
    expect(phone.household.member(founderId)).toMatchObject({ name: 'Me', leftAt: 0 });
    expect(phone.lists.lists().map((list) => [list.name, list.kind])).toEqual([
      ['Groceries', 'grocery'],
      ['To-dos', 'todo'],
    ]);
  });

  it('adds, renames and recolours members', () => {
    const phone = createDevice('a');
    phone.household.initialise({ name: 'Flat', timeZone: 'UTC', founderName: 'Ngozi' });
    const sam = phone.household.addMember(' Sam ');
    expect(phone.household.member(sam)).toMatchObject({ name: 'Sam', color: '#E0573F' });
    phone.household.renameMember(sam, 'Sam Reyes');
    phone.household.setMemberColor(sam, '#3A78C9');
    expect(phone.household.member(sam)).toMatchObject({ name: 'Sam Reyes', color: '#3A78C9' });
    phone.household.rename('The flat');
    expect(phone.store.getValue('householdName')).toBe('The flat');
  });

  it('validates input', () => {
    const phone = createDevice('a');
    const code = (fn: () => unknown) => {
      try {
        fn();
        return null;
      } catch (error) {
        return isTandemError(error) ? error.code : 'other';
      }
    };
    expect(code(() => phone.household.addMember('   '))).toBe('INVALID_INPUT');
    expect(code(() => phone.household.renameMember('nobody', 'X'))).toBe('MEMBER_NOT_FOUND');
    expect(code(() => phone.household.renameMember('nobody', ' '))).toBe('INVALID_INPUT');
    expect(code(() => phone.household.setMemberColor('nobody', '#000'))).toBe('MEMBER_NOT_FOUND');
    expect(code(() => phone.household.rejoin('nobody'))).toBe('MEMBER_NOT_FOUND');
    expect(code(() => phone.household.rename(''))).toBe('INVALID_INPUT');
  });

  it('soft-leaves, unassigns their chores and can rejoin', () => {
    const phone = createDevice('a');
    phone.household.initialise({ name: 'Flat', timeZone: 'UTC', founderName: 'Ngozi' });
    const sam = phone.household.addMember('Sam');
    const chore = phone.chores.addChore({
      title: 'Bins',
      recurrence: { kind: 'weekly', interval: 1 },
      dueDate: '2026-10-05',
      assigneeId: sam,
    });
    const other = phone.chores.addChore({
      title: 'Dishes',
      recurrence: { kind: 'daily', interval: 1 },
      dueDate: '2026-10-05',
      assigneeId: 'x',
    });

    phone.household.leave(sam);
    phone.household.leave('nobody');
    expect(phone.household.activeMembers().map((m) => m.name)).toEqual(['Ngozi']);
    expect(phone.household.members()).toHaveLength(2);
    expect(phone.chores.chore(chore)?.assigneeId).toBe('');
    expect(phone.chores.chore(other)?.assigneeId).toBe('x');

    phone.household.rejoin(sam);
    expect(phone.household.activeMembers()).toHaveLength(2);
  });
});
