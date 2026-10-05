import { useMemo } from 'react';

import { useApp, useHousehold } from '@/composition/AppProvider';
import { useDeviceValue, useTable, useValue } from '@/core/store/hooks';

import { sortMembers, type Member } from '../lib/members';

export function useMembers(): Member[] {
  const { store } = useHousehold();
  const table = useTable('members', store);
  return useMemo(
    () =>
      sortMembers(
        Object.entries(table).map(([id, row]) => ({
          id,
          name: row.name ?? '',
          color: row.color ?? '#1F7A63',
          joinedAt: row.joinedAt ?? 0,
          leftAt: row.leftAt ?? 0,
        })),
      ),
    [table],
  );
}

export function useActiveMembers(): Member[] {
  const members = useMembers();
  return useMemo(() => members.filter((member) => member.leftAt === 0), [members]);
}

/** Includes members who left, so old items still show who they belonged to. */
export function useMemberMap(): Map<string, Member> {
  const members = useMembers();
  return useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
}

export function useHouseholdName(): string {
  const { store } = useHousehold();
  return useValue('householdName', store) ?? '';
}

export function useHouseholdTimeZone(): string {
  const { store } = useHousehold();
  return useValue('timeZone', store) ?? 'UTC';
}

export function useCurrentMemberId(): string {
  const { device } = useApp();
  return useDeviceValue('memberId', device) ?? '';
}
