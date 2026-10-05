import { TandemError } from '../../../core/errors/TandemError';
import { rowId } from '../../../core/lib/ids';
import { type HouseholdStore } from '../../../core/store/types';
import { type Chore, type ChoreDraft, type ChorePatch } from '../lib/chore';
import { compareLocalDates, isLocalDate, isLocalTime } from '../lib/localDate';
import { decodeRecurrence, encodeRecurrence } from '../lib/recurrence';
import { decodeRotation, encodeRotation } from '../lib/rotation';
import { planCompletion, type Completion } from '../lib/schedule';

export type ChoresRepository = ReturnType<typeof createChoresRepository>;

type ChoreRow = {
  title: string;
  assigneeId: string;
  rotation: string;
  recurrence: string;
  dueDate: string;
  dueTime: string;
  createdAt: number;
  lastDoneAt: number;
  lastDoneBy: string;
};

export function decodeChore(id: string, row: ChoreRow): Chore {
  return {
    id,
    title: row.title,
    assigneeId: row.assigneeId,
    rotation: decodeRotation(row.rotation),
    recurrence: decodeRecurrence(row.recurrence),
    dueDate: row.dueDate,
    dueTime: isLocalTime(row.dueTime) ? row.dueTime : '09:00',
    createdAt: row.createdAt,
    lastDoneAt: row.lastDoneAt,
    lastDoneBy: row.lastDoneBy,
  };
}

export type CompletionResult = Completion & { previous: Chore };

export function createChoresRepository(store: HouseholdStore, now: () => number = Date.now) {
  const readChore = (id: string): Chore | null =>
    store.hasRow('chores', id) ? decodeChore(id, store.getRow('chores', id)) : null;

  const requireChore = (id: string): Chore => {
    const chore = readChore(id);
    if (!chore)
      throw new TandemError('CHORE_NOT_FOUND', 'That chore was removed on another device.');
    return chore;
  };

  const validate = (patch: ChorePatch) => {
    if (patch.title !== undefined && !patch.title.trim()) {
      throw new TandemError('INVALID_INPUT', 'A chore needs a name.');
    }
    if (patch.dueDate !== undefined && !isLocalDate(patch.dueDate)) {
      throw new TandemError('INVALID_INPUT', 'That due date is not valid.');
    }
    if (patch.dueTime !== undefined && !isLocalTime(patch.dueTime)) {
      throw new TandemError('INVALID_INPUT', 'That time is not valid.');
    }
  };

  const encode = (patch: ChorePatch) => {
    const cells: Partial<ChoreRow> = {};
    if (patch.title !== undefined)
      cells.title = patch.title.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (patch.assigneeId !== undefined) cells.assigneeId = patch.assigneeId;
    if (patch.rotation !== undefined) cells.rotation = encodeRotation(patch.rotation);
    if (patch.recurrence !== undefined) cells.recurrence = encodeRecurrence(patch.recurrence);
    if (patch.dueDate !== undefined) cells.dueDate = patch.dueDate;
    if (patch.dueTime !== undefined) cells.dueTime = patch.dueTime;
    return cells;
  };

  return {
    chore: readChore,

    chores(): Chore[] {
      return store
        .getRowIds('chores')
        .map(readChore)
        .filter((chore): chore is Chore => chore !== null)
        .sort(
          (a, b) =>
            compareLocalDates(a.dueDate, b.dueDate) ||
            a.dueTime.localeCompare(b.dueTime) ||
            a.title.localeCompare(b.title),
        );
    },

    addChore(draft: ChoreDraft): string {
      validate(draft);
      const id = rowId();
      store.setRow('chores', id, {
        title: '',
        assigneeId: '',
        rotation: '[]',
        dueTime: '09:00',
        ...encode(draft),
        createdAt: now(),
        lastDoneAt: 0,
        lastDoneBy: '',
      });
      return id;
    },

    updateChore(id: string, patch: ChorePatch): void {
      requireChore(id);
      validate(patch);
      const cells = encode(patch);
      if (Object.keys(cells).length > 0) store.setPartialRow('chores', id, cells);
    },

    /**
     * Marks the chore done and moves it to its next occurrence, rotating the
     * assignee if it has a rotation. Two people completing the same chore
     * offline converge on one next occurrence, because both phones compute
     * it from the same due date and rotation.
     */
    completeChore(
      id: string,
      context: { memberId: string; timeZone: string; activeMemberIds: ReadonlySet<string> },
    ): CompletionResult {
      const previous = requireChore(id);
      const completion = planCompletion(previous, now(), context.timeZone, context.activeMemberIds);
      store.setPartialRow('chores', id, {
        dueDate: completion.dueDate,
        assigneeId: completion.assigneeId,
        lastDoneAt: completion.doneAt,
        lastDoneBy: context.memberId,
      });
      return { ...completion, previous };
    },

    /** Undo for a completion: puts back the occurrence and assignee it replaced. */
    revertCompletion(previous: Chore): void {
      if (!store.hasRow('chores', previous.id)) return;
      store.setPartialRow('chores', previous.id, {
        dueDate: previous.dueDate,
        assigneeId: previous.assigneeId,
        lastDoneAt: previous.lastDoneAt,
        lastDoneBy: previous.lastDoneBy,
      });
    },

    deleteChore(id: string): Chore {
      const chore = requireChore(id);
      store.delRow('chores', id);
      return chore;
    },

    restoreChore(chore: Chore): void {
      const { id, ...rest } = chore;
      store.setRow('chores', id, {
        ...encode(rest),
        createdAt: rest.createdAt,
        lastDoneAt: rest.lastDoneAt,
        lastDoneBy: rest.lastDoneBy,
      });
    },
  };
}
