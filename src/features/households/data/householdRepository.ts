import { TandemError } from '../../../core/errors/TandemError';
import { rowId } from '../../../core/lib/ids';
import { type HouseholdStore } from '../../../core/store/types';
import { nextMemberColor, normaliseMemberName, sortMembers, type Member } from '../lib/members';

export type HouseholdRepository = ReturnType<typeof createHouseholdRepository>;

/**
 * Household-level writes. Each method is a single TinyBase transaction so a
 * peer never observes half of an operation (a household with no lists, a
 * member with no colour).
 */
export function createHouseholdRepository(store: HouseholdStore, now: () => number = Date.now) {
  const readMember = (id: string): Member | null => {
    if (!store.hasRow('members', id)) return null;
    const row = store.getRow('members', id);
    return {
      id,
      name: row.name ?? '',
      color: row.color ?? '',
      joinedAt: row.joinedAt ?? 0,
      leftAt: row.leftAt ?? 0,
    };
  };

  const allMembers = (): Member[] =>
    sortMembers(
      store
        .getRowIds('members')
        .map(readMember)
        .filter((member): member is Member => member !== null),
    );

  return {
    /** Seeds a brand new household with its founder and the two default lists. */
    initialise(input: { name: string; timeZone: string; founderName: string }): {
      founderId: string;
    } {
      const founderId = rowId();
      const createdAt = now();
      store.transaction(() => {
        store.setValues({
          householdName: input.name.trim() || 'Our home',
          timeZone: input.timeZone,
          createdAt,
        });
        store.setRow('members', founderId, {
          name: normaliseMemberName(input.founderName) || 'Me',
          color: nextMemberColor([]),
          joinedAt: createdAt,
        });
        store.setRow('lists', rowId(), {
          name: 'Groceries',
          kind: 'grocery',
          position: 1,
          createdAt,
        });
        store.setRow('lists', rowId(), { name: 'To-dos', kind: 'todo', position: 2, createdAt });
      });
      return { founderId };
    },

    addMember(name: string): string {
      const clean = normaliseMemberName(name);
      if (!clean) throw new TandemError('INVALID_INPUT', 'A member needs a name.');
      const id = rowId();
      store.setRow('members', id, {
        name: clean,
        color: nextMemberColor(
          allMembers()
            .filter((m) => !m.leftAt)
            .map((m) => m.color),
        ),
        joinedAt: now(),
      });
      return id;
    },

    /** Re-joining under an old name brings the same member back, history intact. */
    rejoin(memberId: string): void {
      if (!store.hasRow('members', memberId))
        throw new TandemError('MEMBER_NOT_FOUND', 'That member is not in this household.');
      store.setCell('members', memberId, 'leftAt', 0);
    },

    renameMember(memberId: string, name: string): void {
      const clean = normaliseMemberName(name);
      if (!clean) throw new TandemError('INVALID_INPUT', 'A member needs a name.');
      if (!store.hasRow('members', memberId))
        throw new TandemError('MEMBER_NOT_FOUND', 'That member is not in this household.');
      store.setCell('members', memberId, 'name', clean);
    },

    setMemberColor(memberId: string, color: string): void {
      if (!store.hasRow('members', memberId))
        throw new TandemError('MEMBER_NOT_FOUND', 'That member is not in this household.');
      store.setCell('members', memberId, 'color', color);
    },

    /**
     * Leaving is a soft delete. Chores they were assigned stay assigned until
     * someone reassigns them, and rotations skip them from now on.
     */
    leave(memberId: string): void {
      if (!store.hasRow('members', memberId)) return;
      store.transaction(() => {
        store.setCell('members', memberId, 'leftAt', now());
        for (const choreId of store.getRowIds('chores')) {
          if (store.getCell('chores', choreId, 'assigneeId') === memberId) {
            store.setCell('chores', choreId, 'assigneeId', '');
          }
        }
      });
    },

    rename(name: string): void {
      const clean = name.replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!clean) throw new TandemError('INVALID_INPUT', 'The household needs a name.');
      store.setValue('householdName', clean);
    },

    member: readMember,
    members: allMembers,
    activeMembers: (): Member[] => allMembers().filter((member) => member.leftAt === 0),
  };
}
