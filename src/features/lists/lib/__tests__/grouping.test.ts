import { byPosition, groupItems, progressOf, type ItemSummary } from '../grouping';

const item = (id: string, patch: Partial<ItemSummary>): ItemSummary => ({
  id,
  title: id,
  category: 'other',
  done: false,
  position: 0,
  completedAt: 0,
  ...patch,
});

describe('groupItems', () => {
  const items = [
    item('milk', { category: 'dairy', position: 2 }),
    item('apples', { category: 'produce', position: 3 }),
    item('eggs', { category: 'dairy', position: 1 }),
    item('bread', { category: 'bakery', done: true, completedAt: 10 }),
    item('jam', { category: 'pantry', done: true, completedAt: 20 }),
    item('mystery', { category: 'not-a-category', position: 4 }),
  ];

  it('orders sections by aisle and items by position, with done last', () => {
    const sections = groupItems(items, 'grocery');
    expect(sections.map((s) => s.key)).toEqual(['produce', 'dairy', 'other', 'done']);
    expect(sections[1]?.items.map((i) => i.id)).toEqual(['eggs', 'milk']);
    expect(sections[3]?.items.map((i) => i.id)).toEqual(['jam', 'bread']);
    expect(sections[0]?.title).toBe('Fruit & veg');
  });

  it('puts unknown categories in the last bucket for the list kind', () => {
    const sections = groupItems([item('call', { category: 'dairy' })], 'todo');
    expect(sections.map((s) => s.key)).toEqual(['general']);
  });

  it('can hide done items', () => {
    expect(groupItems(items, 'grocery', { showDone: false }).map((s) => s.key)).not.toContain(
      'done',
    );
  });

  it('breaks position ties by id so two phones see the same order', () => {
    const a = item('a', { position: 1 });
    const b = item('b', { position: 1 });
    expect([b, a].sort(byPosition).map((i) => i.id)).toEqual(['a', 'b']);
    expect(byPosition(a, a)).toBe(0);
  });

  it('reports progress', () => {
    expect(progressOf(items)).toEqual({ done: 2, total: 6 });
  });
});
