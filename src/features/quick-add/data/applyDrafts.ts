import { type Repositories } from '../../../composition/householdRuntime';
import { zonedToInstant } from '../../chores/lib/zonedTime';
import { type QuickAddDraft } from '../lib/contract';

export type ApplySummary = { items: number; chores: number };

/**
 * Writes confirmed drafts. Groceries go to the first grocery list and to-dos
 * to the first to-do list, creating either if the household deleted them.
 */
export function applyDrafts(
  repos: Repositories,
  drafts: readonly QuickAddDraft[],
  context: { memberId: string; timeZone: string },
): ApplySummary {
  const summary: ApplySummary = { items: 0, chores: 0 };
  const listFor = (kind: 'grocery' | 'todo') =>
    repos.lists.firstListOfKind(kind)?.id ??
    repos.lists.createList(kind === 'grocery' ? 'Groceries' : 'To-dos', kind);

  for (const draft of drafts) {
    if (draft.kind === 'chore' && draft.recurrence && draft.dueDate) {
      repos.chores.addChore({
        title: draft.title,
        recurrence: draft.recurrence,
        dueDate: draft.dueDate,
        dueTime: draft.dueTime ?? '09:00',
        assigneeId: draft.assigneeId ?? '',
        rotation: draft.rotation,
      });
      summary.chores += 1;
      continue;
    }
    const kind = draft.kind === 'grocery' ? 'grocery' : 'todo';
    repos.lists.addItem(listFor(kind), {
      title: draft.title,
      category: draft.category,
      quantity: draft.quantity,
      assigneeId: draft.assigneeId ?? '',
      dueAt: draft.dueDate
        ? zonedToInstant(draft.dueDate, draft.dueTime ?? '09:00', context.timeZone)
        : 0,
      createdBy: context.memberId,
    });
    summary.items += 1;
  }
  return summary;
}
