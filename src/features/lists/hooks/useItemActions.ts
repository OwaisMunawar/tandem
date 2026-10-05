import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useHousehold } from '@/composition/AppProvider';
import { useToast } from '@/core/ui';

import { type Item } from '../lib/items';

/** Item interactions shared by every list: toggle, delete with undo, reorder, open. */
export function useItemActions() {
  const { repos } = useHousehold();
  const toast = useToast();
  const router = useRouter();

  const onToggle = useCallback((item: Item) => repos.lists.setDone(item.id, !item.done), [repos]);

  const onDelete = useCallback(
    (item: Item) => {
      const removed = repos.lists.deleteItem(item.id);
      toast.show({
        message: `Deleted “${removed.title}”`,
        actionLabel: 'Undo',
        onAction: () => repos.lists.restoreItem(removed),
      });
    },
    [repos, toast],
  );

  const onMove = useCallback(
    (item: Item, direction: -1 | 1) => repos.lists.moveItem(item.id, direction),
    [repos],
  );

  const onOpen = useCallback(
    (item: Item) => router.push({ pathname: '/item/[id]', params: { id: item.id } }),
    [router],
  );

  const onClearDone = useCallback(
    (listId: string) => {
      const cleared = repos.lists.clearDone(listId);
      if (cleared.length === 0) return;
      toast.show({
        message: `Cleared ${cleared.length} done`,
        actionLabel: 'Undo',
        onAction: () => repos.lists.restoreItems(cleared),
      });
    },
    [repos, toast],
  );

  return { onToggle, onDelete, onMove, onOpen, onClearDone };
}
