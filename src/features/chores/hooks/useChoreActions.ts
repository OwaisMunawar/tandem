import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

import { useHousehold } from '@/composition/AppProvider';
import { useToast } from '@/core/ui';
import {
  useActiveMembers,
  useCurrentMemberId,
  useHouseholdTimeZone,
  useMemberMap,
} from '@/features/households/hooks/useHouseholdData';
import { firstName } from '@/features/households/lib/members';

import { type Chore } from '../lib/chore';

export function useChoreActions() {
  const { repos } = useHousehold();
  const toast = useToast();
  const memberId = useCurrentMemberId();
  const timeZone = useHouseholdTimeZone();
  const active = useActiveMembers();
  const members = useMemberMap();

  const complete = useCallback(
    (chore: Chore) => {
      const result = repos.chores.completeChore(chore.id, {
        memberId,
        timeZone,
        activeMemberIds: new Set(active.map((member) => member.id)),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const next = members.get(result.assigneeId);
      const handover =
        result.assigneeId !== chore.assigneeId && next ? ` · ${firstName(next.name)} is next` : '';
      toast.show({
        message: `${chore.title} done${handover}`,
        actionLabel: 'Undo',
        onAction: () => repos.chores.revertCompletion(result.previous),
      });
    },
    [active, memberId, members, repos, timeZone, toast],
  );

  return { complete };
}
