import { isTandemError } from '@/core/errors/TandemError';
import { createDevice } from '@/test-utils/devices';

function setup() {
  const phone = createDevice('a');
  phone.household.initialise({ name: 'Flat', timeZone: 'UTC', founderName: 'Ngozi' });
  const groceries = phone.lists.firstListOfKind('grocery')?.id ?? '';
  return { phone, groceries };
}

const codeOf = (fn: () => unknown) => {
  try {
    fn();
    return null;
  } catch (error) {
    return isTandemError(error) ? error.code : 'other';
  }
};

describe('listsRepository', () => {
  it('adds items with automatic categories and positions', () => {
    const { phone, groceries } = setup();
    const milk = phone.lists.addItem(groceries, {
      title: '  Oat   milk ',
      quantity: ' 2 L ',
      createdBy: 'ngozi',
    });
    const plain = phone.lists.addItem(groceries, { title: 'Lightbulbs', category: 'household' });
    const bad = phone.lists.addItem(groceries, { title: 'Thing', category: 'nonsense' });
    expect(phone.lists.item(milk)).toMatchObject({
      title: 'Oat milk',
      category: 'dairy',
      quantity: '2 L',
      position: 1024,
      done: false,
    });
    expect(phone.lists.item(plain)).toMatchObject({ category: 'household', position: 2048 });
    expect(phone.lists.item(bad)?.category).toBe('other');
    expect(phone.lists.item('missing')).toBeNull();
    expect(phone.lists.list('missing')).toBeNull();
  });

  it('creates lists and rejects bad input', () => {
    const { phone, groceries } = setup();
    const id = phone.lists.createList('Hardware', 'todo');
    expect(phone.lists.lists().map((list) => list.name)).toEqual([
      'Groceries',
      'To-dos',
      'Hardware',
    ]);
    expect(phone.lists.list(id)?.kind).toBe('todo');
    expect(codeOf(() => phone.lists.createList(' ', 'todo'))).toBe('INVALID_INPUT');
    expect(codeOf(() => phone.lists.addItem('nope', { title: 'x' }))).toBe('LIST_NOT_FOUND');
    expect(codeOf(() => phone.lists.addItem(groceries, { title: ' ' }))).toBe('INVALID_INPUT');
  });

  it('only writes cells that actually changed', () => {
    const { phone, groceries } = setup();
    const id = phone.lists.addItem(groceries, { title: 'Milk' });
    const before = JSON.stringify(phone.store.getMergeableContent());
    phone.lists.updateItem(id, { title: 'Milk', note: '' });
    expect(JSON.stringify(phone.store.getMergeableContent())).toBe(before);
    phone.lists.updateItem(id, {
      title: 'Oat milk',
      note: ' barista ',
      assigneeId: 'sam',
      dueAt: 5,
      category: 'dairy',
    });
    expect(phone.lists.item(id)).toMatchObject({
      title: 'Oat milk',
      note: 'barista',
      assigneeId: 'sam',
      dueAt: 5,
    });
    expect(codeOf(() => phone.lists.updateItem(id, { title: '  ' }))).toBe('INVALID_INPUT');
    expect(codeOf(() => phone.lists.updateItem('gone', { title: 'x' }))).toBe('ITEM_NOT_FOUND');
  });

  it('ticks, unticks, deletes and restores', () => {
    const { phone, groceries } = setup();
    const id = phone.lists.addItem(groceries, { title: 'Milk' });
    phone.tick();
    phone.lists.setDone(id, true);
    expect(phone.lists.item(id)).toMatchObject({ done: true });
    expect(phone.lists.item(id)?.completedAt).toBeGreaterThan(0);
    phone.lists.setDone(id, false);
    expect(phone.lists.item(id)).toMatchObject({ done: false, completedAt: 0 });

    const removed = phone.lists.deleteItem(id);
    expect(phone.lists.item(id)).toBeNull();
    phone.lists.restoreItem(removed);
    expect(phone.lists.item(id)?.title).toBe('Milk');
  });

  it('clears done items in one go, with undo', () => {
    const { phone, groceries } = setup();
    const a = phone.lists.addItem(groceries, { title: 'A' });
    const b = phone.lists.addItem(groceries, { title: 'B' });
    phone.lists.addItem(groceries, { title: 'C' });
    phone.lists.setDone(a, true);
    phone.lists.setDone(b, true);
    const cleared = phone.lists.clearDone(groceries);
    expect(cleared.map((item) => item.title)).toEqual(['A', 'B']);
    expect(phone.lists.itemsOf(groceries).map((item) => item.title)).toEqual(['C']);
    phone.lists.restoreItems(cleared);
    expect(phone.lists.itemsOf(groceries)).toHaveLength(3);
  });

  it('moves items within their category and renumbers when precision runs out', () => {
    const { phone, groceries } = setup();
    const ids = ['Milk', 'Eggs', 'Butter'].map((title) =>
      phone.lists.addItem(groceries, { title, category: 'dairy' }),
    );
    const titles = () => phone.lists.itemsOf(groceries).map((item) => item.title);

    expect(phone.lists.moveItem(ids[2] ?? '', -1)).toBe(true);
    expect(titles()).toEqual(['Milk', 'Butter', 'Eggs']);
    expect(phone.lists.moveItem(ids[0] ?? '', -1)).toBe(false);
    expect(phone.lists.moveItem(ids[1] ?? '', 1)).toBe(false);

    // Squeeze two neighbours together until the gap is below precision.
    phone.store.setCell('items', ids[0] ?? '', 'position', 1);
    phone.store.setCell('items', ids[2] ?? '', 'position', 1 + 1e-9);
    phone.store.setCell('items', ids[1] ?? '', 'position', 5);
    expect(phone.lists.moveItem(ids[1] ?? '', -1)).toBe(true);
    expect(titles()).toEqual(['Milk', 'Eggs', 'Butter']);
  });

  it('finds the first list of a kind', () => {
    const { phone } = setup();
    expect(phone.lists.firstListOfKind('todo')?.name).toBe('To-dos');
    const empty = createDevice('b');
    expect(empty.lists.firstListOfKind('grocery')).toBeNull();
  });
});
