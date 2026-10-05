import { compareLocalDates, type LocalDate, type LocalTime } from './localDate';
import { nextDueDate, type Recurrence } from './recurrence';
import { nextAssignee } from './rotation';
import { toZonedDate, zonedToInstant } from './zonedTime';

export type ChoreTiming = {
  dueDate: LocalDate;
  dueTime: LocalTime;
  recurrence: Recurrence;
  assigneeId: string;
  rotation: readonly string[];
};

export type Completion = {
  dueDate: LocalDate;
  assigneeId: string;
  doneAt: number;
};

/**
 * What completing a chore changes. Pure, so the same plan can be unit tested,
 * applied to the store, and used to reschedule the reminder.
 */
export function planCompletion(
  chore: ChoreTiming,
  doneAt: number,
  timeZone: string,
  activeMemberIds: ReadonlySet<string>,
): Completion {
  const doneOn = toZonedDate(doneAt, timeZone);
  return {
    dueDate: nextDueDate(chore.recurrence, chore.dueDate, doneOn),
    assigneeId:
      chore.rotation.length > 0
        ? nextAssignee(chore.rotation, chore.assigneeId, activeMemberIds)
        : chore.assigneeId,
    doneAt,
  };
}

export type ChoreBucket = 'overdue' | 'today' | 'upcoming';

export function bucketFor(dueDate: LocalDate, today: LocalDate): ChoreBucket {
  const order = compareLocalDates(dueDate, today);
  return order < 0 ? 'overdue' : order === 0 ? 'today' : 'upcoming';
}

export function dueInstant(chore: Pick<ChoreTiming, 'dueDate' | 'dueTime'>, timeZone: string) {
  return zonedToInstant(chore.dueDate, chore.dueTime, timeZone);
}
