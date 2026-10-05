import { useMemo } from 'react';

import { useHousehold } from '@/composition/AppProvider';
import { useRow, useTable } from '@/core/store/hooks';

import { byPosition } from '../lib/grouping';
import { asListKind, type Item, type List } from '../lib/items';

export function useLists(): List[] {
  const { store } = useHousehold();
  const table = useTable('lists', store);
  return useMemo(
    () =>
      Object.entries(table)
        .map(([id, row]) => ({
          id,
          name: row.name ?? '',
          kind: asListKind(row.kind ?? 'todo'),
          position: row.position ?? 0,
          createdAt: row.createdAt ?? 0,
        }))
        .sort((a, b) => a.position - b.position || a.createdAt - b.createdAt),
    [table],
  );
}

export function useList(listId: string): List | null {
  return useLists().find((list) => list.id === listId) ?? null;
}

export function useAllItems(): Item[] {
  const { store } = useHousehold();
  const table = useTable('items', store);
  return useMemo(() => Object.entries(table).map(([id, row]) => ({ id, ...row }) as Item), [table]);
}

export function useListItems(listId: string): Item[] {
  const items = useAllItems();
  return useMemo(
    () => items.filter((item) => item.listId === listId).sort(byPosition),
    [items, listId],
  );
}

export function useItem(itemId: string): Item | null {
  const { store } = useHousehold();
  const row = useRow('items', itemId, store);
  return Object.keys(row).length > 0 ? ({ id: itemId, ...row } as Item) : null;
}
