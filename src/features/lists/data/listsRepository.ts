import { TandemError } from '../../../core/errors/TandemError';
import { rowId } from '../../../core/lib/ids';
import { type HouseholdStore } from '../../../core/store/types';
import { categorize, isCategory, type ListKind } from '../lib/categories';
import { byPosition } from '../lib/grouping';
import {
  asListKind,
  normaliseTitle,
  type Item,
  type ItemDraft,
  type ItemPatch,
  type List,
} from '../lib/items';
import { needsRenumber, positionAtEnd, positionForStep, renumber } from '../lib/ordering';

export type ListsRepository = ReturnType<typeof createListsRepository>;

/**
 * Writes go cell by cell (setPartialRow) rather than replacing rows. Each
 * cell carries its own CRDT timestamp, so editing a note on one phone and
 * ticking the item on another both survive the merge.
 */
export function createListsRepository(store: HouseholdStore, now: () => number = Date.now) {
  const readList = (id: string): List | null => {
    if (!store.hasRow('lists', id)) return null;
    const row = store.getRow('lists', id);
    return {
      id,
      name: row.name,
      kind: asListKind(row.kind),
      position: row.position,
      createdAt: row.createdAt,
    };
  };

  const readItem = (id: string): Item | null => {
    if (!store.hasRow('items', id)) return null;
    return { id, ...store.getRow('items', id) } as Item;
  };

  const itemsOf = (listId: string): Item[] =>
    store
      .getRowIds('items')
      .map(readItem)
      .filter((item): item is Item => item !== null && item.listId === listId)
      .sort(byPosition);

  const requireItem = (id: string): Item => {
    const item = readItem(id);
    if (!item) throw new TandemError('ITEM_NOT_FOUND', 'That item was removed on another device.');
    return item;
  };

  const lists = (): List[] =>
    store
      .getRowIds('lists')
      .map(readList)
      .filter((list): list is List => list !== null)
      .sort((a, b) => a.position - b.position || a.createdAt - b.createdAt);

  /**
   * Moves an item one place up or down within its category. Renumbers the
   * category only when fractional positions have run out of precision.
   */
  function moveItem(id: string, direction: -1 | 1): boolean {
    const item = requireItem(id);
    const siblings = itemsOf(item.listId).filter(
      (other) => other.category === item.category && other.done === item.done,
    );
    const index = siblings.findIndex((other) => other.id === id);
    const neighbour = siblings[index + direction];
    const beyond = siblings[index + 2 * direction];
    if (!neighbour) return false;
    const [low, high] =
      direction === -1
        ? [beyond?.position, neighbour.position]
        : [neighbour.position, beyond?.position];
    if (needsRenumber(low, high)) {
      const positions = renumber(siblings);
      store.transaction(() =>
        positions.forEach((position, rowKey) =>
          store.setCell('items', rowKey, 'position', position),
        ),
      );
      return moveItem(id, direction);
    }
    const position = positionForStep(siblings, id, direction);
    if (position === undefined) return false;
    store.setCell('items', id, 'position', position);
    return true;
  }

  return {
    lists,
    list: readList,
    item: readItem,
    itemsOf,

    firstListOfKind(kind: ListKind): List | null {
      return lists().find((list) => list.kind === kind) ?? null;
    },

    createList(name: string, kind: ListKind): string {
      const clean = normaliseTitle(name);
      if (!clean) throw new TandemError('INVALID_INPUT', 'A list needs a name.');
      const id = rowId();
      store.setRow('lists', id, {
        name: clean,
        kind,
        position: positionAtEnd(lists().map((list) => list.position)),
        createdAt: now(),
      });
      return id;
    },

    addItem(listId: string, draft: ItemDraft): string {
      const list = readList(listId);
      if (!list) throw new TandemError('LIST_NOT_FOUND', 'That list no longer exists.');
      const title = normaliseTitle(draft.title);
      if (!title) throw new TandemError('INVALID_INPUT', 'An item needs a title.');
      const id = rowId();
      store.setRow('items', id, {
        listId,
        title,
        category:
          draft.category && isCategory(draft.category)
            ? draft.category
            : categorize(title, list.kind),
        quantity: draft.quantity?.trim() ?? '',
        note: draft.note?.trim() ?? '',
        done: false,
        assigneeId: draft.assigneeId ?? '',
        dueAt: draft.dueAt ?? 0,
        position: positionAtEnd(itemsOf(listId).map((item) => item.position)),
        createdAt: now(),
        createdBy: draft.createdBy ?? '',
        completedAt: 0,
      });
      return id;
    },

    updateItem(id: string, patch: ItemPatch): void {
      const current = requireItem(id);
      const changes: ItemPatch = {};
      if (patch.title !== undefined) {
        const title = normaliseTitle(patch.title);
        if (!title) throw new TandemError('INVALID_INPUT', 'An item needs a title.');
        if (title !== current.title) changes.title = title;
      }
      for (const key of ['category', 'quantity', 'note', 'assigneeId'] as const) {
        const value = patch[key]?.trim();
        if (value !== undefined && value !== current[key]) changes[key] = value;
      }
      if (patch.dueAt !== undefined && patch.dueAt !== current.dueAt) changes.dueAt = patch.dueAt;
      // Only touched cells get new timestamps; untouched ones keep merging freely.
      if (Object.keys(changes).length > 0) store.setPartialRow('items', id, changes);
    },

    setDone(id: string, done: boolean): void {
      requireItem(id);
      store.setPartialRow('items', id, { done, completedAt: done ? now() : 0 });
    },

    /** Returns the deleted row so the caller can offer undo. */
    deleteItem(id: string): Item {
      const item = requireItem(id);
      store.delRow('items', id);
      return item;
    },

    /** Undo re-creates the row under its old id, which merges as a fresh write. */
    restoreItem(item: Item): void {
      const { id, ...row } = item;
      store.setRow('items', id, row);
    },

    clearDone(listId: string): Item[] {
      const done = itemsOf(listId).filter((item) => item.done);
      store.transaction(() => done.forEach((item) => store.delRow('items', item.id)));
      return done;
    },

    restoreItems(items: readonly Item[]): void {
      store.transaction(() => items.forEach(({ id, ...row }) => store.setRow('items', id, row)));
    },

    moveItem,
  };
}
