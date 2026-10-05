import { type Repositories } from '@/composition/householdRuntime';
import { createDevice } from '@/test-utils/devices';

import { parseQuickAdd } from '../../lib/localParser';
import { applyDrafts } from '../applyDrafts';

describe('applyDrafts', () => {
  it('writes groceries, to-dos and chores to the right places', () => {
    const phone = createDevice('a');
    const { founderId } = phone.household.initialise({
      name: 'Flat',
      timeZone: 'Europe/London',
      founderName: 'Ngozi',
    });
    const sam = phone.household.addMember('Sam');
    const repos: Repositories = {
      household: phone.household,
      lists: phone.lists,
      chores: phone.chores,
    };
    const drafts = parseQuickAdd({
      text: 'milk, eggs and pay rent Friday, Sam does dishes daily',
      today: '2026-10-05',
      now: '10:00',
      timeZone: 'Europe/London',
      members: phone.household.activeMembers().map(({ id, name }) => ({ id, name })),
      selfId: founderId,
    });

    expect(applyDrafts(repos, drafts, { memberId: founderId, timeZone: 'Europe/London' })).toEqual({
      items: 3,
      chores: 1,
    });

    const groceries = phone.lists.firstListOfKind('grocery')?.id ?? '';
    const todos = phone.lists.firstListOfKind('todo')?.id ?? '';
    expect(phone.lists.itemsOf(groceries).map((item) => item.title)).toEqual(['Milk', 'Eggs']);
    expect(phone.lists.itemsOf(todos)[0]).toMatchObject({
      title: 'Pay rent',
      dueAt: Date.parse('2026-10-09T08:00:00Z'),
      createdBy: founderId,
    });
    expect(phone.chores.chores()[0]).toMatchObject({ title: 'Dishes', assigneeId: sam });
  });

  it('recreates missing lists instead of dropping drafts', () => {
    const phone = createDevice('b');
    const repos: Repositories = {
      household: phone.household,
      lists: phone.lists,
      chores: phone.chores,
    };
    const drafts = parseQuickAdd({
      text: 'bread, call mum',
      today: '2026-10-05',
      now: '10:00',
      timeZone: 'UTC',
      members: [],
      selfId: null,
    });
    applyDrafts(repos, drafts, { memberId: '', timeZone: 'UTC' });
    expect(
      phone.lists
        .lists()
        .map((list) => list.name)
        .sort(),
    ).toEqual(['Groceries', 'To-dos']);
  });
});
