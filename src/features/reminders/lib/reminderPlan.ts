import { type Chore } from '../../chores/lib/chore';
import { zonedToInstant } from '../../chores/lib/zonedTime';
import { type Item } from '../../lists/lib/items';

export type Reminder = {
  /** Stable per due occurrence, so an edit reschedules instead of duplicating. */
  id: string;
  at: number;
  title: string;
  body: string;
};

const HORIZON_MS = 14 * 86_400_000;
/** iOS keeps at most 64 pending local notifications per app. */
const MAX_PENDING = 60;

/**
 * Which local notifications this phone should have scheduled. Reminders are
 * per device: each phone schedules only what is assigned to its member (or
 * to anyone), so the whole household is not woken up for one person's chore.
 */
export function planReminders(input: {
  chores: readonly Chore[];
  items: readonly Item[];
  memberId: string;
  timeZone: string;
  now: number;
  householdName: string;
}): Reminder[] {
  const { memberId, timeZone, now } = input;
  const mine = (assigneeId: string) => assigneeId === '' || assigneeId === memberId;
  const reminders: Reminder[] = [];

  for (const chore of input.chores) {
    if (!mine(chore.assigneeId) || !chore.dueDate) continue;
    const at = zonedToInstant(chore.dueDate, chore.dueTime, timeZone);
    if (at <= now || at - now > HORIZON_MS) continue;
    reminders.push({
      id: `chore:${chore.id}:${chore.dueDate}:${chore.dueTime}`,
      at,
      title: chore.title,
      body: chore.assigneeId
        ? `Your turn · ${input.householdName}`
        : `Anyone free? · ${input.householdName}`,
    });
  }

  for (const item of input.items) {
    if (item.done || !item.dueAt || !mine(item.assigneeId)) continue;
    if (item.dueAt <= now || item.dueAt - now > HORIZON_MS) continue;
    reminders.push({
      id: `item:${item.id}:${item.dueAt}`,
      at: item.dueAt,
      title: item.title,
      body: `Due now · ${input.householdName}`,
    });
  }

  return reminders.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)).slice(0, MAX_PENDING);
}

/** Minimal set of changes to go from what is scheduled to what should be. */
export function diffReminders(scheduledIds: readonly string[], desired: readonly Reminder[]) {
  const wanted = new Set(desired.map((reminder) => reminder.id));
  const existing = new Set(scheduledIds);
  return {
    cancel: scheduledIds.filter((id) => !wanted.has(id)),
    schedule: desired.filter((reminder) => !existing.has(reminder.id)),
  };
}
