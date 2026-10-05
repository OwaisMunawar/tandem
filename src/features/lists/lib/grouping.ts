import {
  CATEGORY_LABELS,
  categoriesFor,
  isCategory,
  type Category,
  type ListKind,
} from './categories';

export type ItemSummary = {
  id: string;
  title: string;
  category: string;
  done: boolean;
  position: number;
  completedAt: number;
};

export type ItemSection<T extends ItemSummary> = {
  key: string;
  title: string;
  items: T[];
};

export function byPosition<T extends Pick<ItemSummary, 'position' | 'id'>>(a: T, b: T): number {
  // Ties happen when two phones append at once; the id keeps order stable.
  return a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * Open items grouped by category in aisle order, then a single "Done"
 * section with the most recently completed first.
 */
export function groupItems<T extends ItemSummary>(
  items: readonly T[],
  kind: ListKind,
  options: { showDone?: boolean } = {},
): ItemSection<T>[] {
  const order = categoriesFor(kind);
  const buckets = new Map<Category, T[]>();
  const done: T[] = [];

  for (const item of items) {
    if (item.done) {
      done.push(item);
      continue;
    }
    const category: Category =
      isCategory(item.category) && order.includes(item.category)
        ? item.category
        : (order[order.length - 1] as Category);
    const bucket = buckets.get(category) ?? [];
    bucket.push(item);
    buckets.set(category, bucket);
  }

  const sections: ItemSection<T>[] = [];
  for (const category of order) {
    const bucket = buckets.get(category);
    if (bucket?.length) {
      sections.push({
        key: category,
        title: CATEGORY_LABELS[category],
        items: bucket.sort(byPosition),
      });
    }
  }
  if (options.showDone !== false && done.length > 0) {
    sections.push({
      key: 'done',
      title: 'Done',
      items: done.sort((a, b) => b.completedAt - a.completedAt || byPosition(a, b)),
    });
  }
  return sections;
}

export function progressOf(items: readonly Pick<ItemSummary, 'done'>[]) {
  const done = items.filter((item) => item.done).length;
  return { done, total: items.length };
}
