import { type ListKind } from './categories';

export type List = {
  id: string;
  name: string;
  kind: ListKind;
  position: number;
  createdAt: number;
};

export type Item = {
  id: string;
  listId: string;
  title: string;
  category: string;
  quantity: string;
  note: string;
  done: boolean;
  assigneeId: string;
  dueAt: number;
  position: number;
  createdAt: number;
  createdBy: string;
  completedAt: number;
};

export type ItemDraft = Pick<Item, 'title'> &
  Partial<Pick<Item, 'category' | 'quantity' | 'note' | 'assigneeId' | 'dueAt' | 'createdBy'>>;

export type ItemPatch = Partial<
  Pick<Item, 'title' | 'category' | 'quantity' | 'note' | 'assigneeId' | 'dueAt'>
>;

export function asListKind(value: string): ListKind {
  return value === 'grocery' ? 'grocery' : 'todo';
}

export function normaliseTitle(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 120);
}
