import { contentOf, createDevice, exchange, type Device } from '@/test-utils/devices';

/*
 * The local-first promise, as tests: phones edit offline, sync later, and
 * always end up with identical data, no matter the order changes arrive in.
 * Each cell is a last-writer-wins register keyed by a hybrid logical clock,
 * so "later" means a later timestamp, not whoever synced last.
 */

function household(): { a: Device; b: Device; listId: string; itemId: string } {
  const a = createDevice('phone-a');
  const b = createDevice('phone-b');
  a.household.initialise({ name: 'Flat', timeZone: 'Europe/London', founderName: 'Ngozi' });
  const listId = a.lists.firstListOfKind('grocery')?.id ?? '';
  const itemId = a.lists.addItem(listId, { title: 'Milk' });
  // Both phones start from the same synced state.
  exchange(a.store, b.store);
  a.tick();
  b.tick();
  return { a, b, listId, itemId };
}

describe('merge convergence', () => {
  it('starts from an identical copy', () => {
    const { a, b } = household();
    expect(contentOf(b.store)).toEqual(contentOf(a.store));
  });

  it('keeps both sides of edits to different fields of the same item', () => {
    const { a, b, itemId } = household();
    a.lists.updateItem(itemId, { title: 'Oat milk' });
    b.lists.setDone(itemId, true);
    b.lists.updateItem(itemId, { quantity: '2 L' });

    exchange(a.store, b.store);

    expect(contentOf(a.store)).toEqual(contentOf(b.store));
    expect(a.lists.item(itemId)).toMatchObject({ title: 'Oat milk', done: true, quantity: '2 L' });
  });

  it('resolves a same-field conflict to the later edit, whichever phone syncs first', () => {
    const run = (syncOrder: 'a-first' | 'b-first') => {
      const { a, b, itemId } = household();
      a.lists.updateItem(itemId, { title: 'Whole milk' });
      b.tick(5_000);
      b.lists.updateItem(itemId, { title: 'Oat milk' }); // later
      if (syncOrder === 'a-first') exchange(a.store, b.store);
      else exchange(b.store, a.store);
      expect(contentOf(a.store)).toEqual(contentOf(b.store));
      return a.lists.item(itemId)?.title;
    };
    expect(run('a-first')).toBe('Oat milk');
    expect(run('b-first')).toBe('Oat milk');
  });

  it('breaks exact timestamp ties deterministically on every phone', () => {
    const { a, b, itemId } = household();
    a.setTime(Date.parse('2026-10-05T10:00:00Z'));
    b.setTime(Date.parse('2026-10-05T10:00:00Z'));
    a.lists.updateItem(itemId, { note: 'from a' });
    b.lists.updateItem(itemId, { note: 'from b' });
    exchange(a.store, b.store);
    expect(a.lists.item(itemId)?.note).toBe(b.lists.item(itemId)?.note);
  });

  it('keeps concurrent additions from both phones', () => {
    const { a, b, listId } = household();
    a.lists.addItem(listId, { title: 'Eggs' });
    a.lists.addItem(listId, { title: 'Bread' });
    b.lists.addItem(listId, { title: 'Coffee' });

    exchange(a.store, b.store);

    expect(contentOf(a.store)).toEqual(contentOf(b.store));
    expect(
      a.lists
        .itemsOf(listId)
        .map((item) => item.title)
        .sort(),
    ).toEqual(['Bread', 'Coffee', 'Eggs', 'Milk']);
  });

  it('applies a delete on one phone everywhere', () => {
    const { a, b, itemId } = household();
    a.lists.deleteItem(itemId);
    b.lists.addItem(b.lists.lists()[0]?.id ?? '', { title: 'Eggs' });
    exchange(a.store, b.store);
    expect(b.lists.item(itemId)).toBeNull();
    expect(contentOf(a.store)).toEqual(contentOf(b.store));
  });

  it('lets an undo after a delete win over the delete', () => {
    const { a, b, itemId } = household();
    const removed = a.lists.deleteItem(itemId);
    exchange(a.store, b.store);
    a.tick();
    a.lists.restoreItem(removed);
    exchange(a.store, b.store);
    expect(b.lists.item(itemId)?.title).toBe('Milk');
  });

  it('converges when two phones complete the same chore offline', () => {
    const { a, b } = household();
    const choreId = a.chores.addChore({
      title: 'Dishes',
      recurrence: { kind: 'daily', interval: 1 },
      dueDate: '2026-10-05',
      assigneeId: 'sam',
      rotation: ['sam', 'linnea'],
    });
    exchange(a.store, b.store);
    const context = {
      memberId: 'x',
      timeZone: 'Europe/London',
      activeMemberIds: new Set(['sam', 'linnea']),
    };

    a.chores.completeChore(choreId, { ...context, memberId: 'ngozi' });
    b.tick(60_000);
    b.chores.completeChore(choreId, { ...context, memberId: 'linnea' });

    exchange(a.store, b.store);

    expect(contentOf(a.store)).toEqual(contentOf(b.store));
    // Both computed the same next occurrence from the same due date; it is
    // scheduled once, not twice, and the later completer is recorded.
    expect(a.chores.chore(choreId)).toMatchObject({
      dueDate: '2026-10-06',
      assigneeId: 'linnea',
      lastDoneBy: 'linnea',
    });
  });

  it('keeps reorders of different items made on different phones', () => {
    const { a, b, listId } = household();
    a.lists.addItem(listId, { title: 'Eggs', category: 'dairy' });
    a.lists.addItem(listId, { title: 'Butter', category: 'dairy' });
    exchange(a.store, b.store);
    const [milk, eggs, butter] = a.lists.itemsOf(listId);

    a.lists.moveItem(butter?.id ?? '', -1); // Milk, Butter, Eggs on A
    b.lists.updateItem(milk?.id ?? '', { note: 'semi-skimmed' });
    exchange(a.store, b.store);

    expect(b.lists.itemsOf(listId).map((item) => item.title)).toEqual(['Milk', 'Butter', 'Eggs']);
    expect(b.lists.item(milk?.id ?? '')?.note).toBe('semi-skimmed');
    expect(eggs).toBeDefined();
  });

  it('converges three phones regardless of the order they meet in', () => {
    const { a, b, itemId, listId } = household();
    const c = createDevice('phone-c');
    exchange(c.store, a.store);
    c.tick(2_000);

    a.lists.updateItem(itemId, { title: 'Milk (2)' });
    b.lists.addItem(listId, { title: 'Eggs' });
    c.lists.updateItem(itemId, { title: 'Milk x2' }); // latest title
    c.household.addMember('Sam');

    // Gossip in a chain: a meets b, b meets c, c meets a.
    exchange(a.store, b.store);
    exchange(b.store, c.store);
    exchange(c.store, a.store);
    exchange(a.store, b.store);

    expect(contentOf(a.store)).toEqual(contentOf(b.store));
    expect(contentOf(b.store)).toEqual(contentOf(c.store));
    expect(a.lists.item(itemId)?.title).toBe('Milk x2');
    expect(a.household.activeMembers().map((m) => m.name)).toEqual(['Ngozi', 'Sam']);
  });

  it('is idempotent: syncing the same changes twice changes nothing', () => {
    const { a, b, itemId } = household();
    a.lists.updateItem(itemId, { title: 'Oat milk' });
    exchange(a.store, b.store);
    const once = JSON.stringify(b.store.getMergeableContent());
    exchange(a.store, b.store);
    expect(JSON.stringify(b.store.getMergeableContent())).toBe(once);
  });
});
