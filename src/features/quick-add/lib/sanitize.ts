import { categoriesFor, categorize, isCategory, type ListKind } from '../../lists/lib/categories';
import { type QuickAddDraft, type QuickAddRequest } from './contract';

/**
 * Normalises drafts from either parser before the preview shows them. The
 * LLM can return a member id that does not exist or a grocery category on a
 * to-do; rather than reject the whole response, each field is repaired or
 * cleared so the user still gets a useful preview to correct.
 */
export function sanitizeDrafts(
  drafts: readonly QuickAddDraft[],
  request: Pick<QuickAddRequest, 'members' | 'today'>,
): QuickAddDraft[] {
  const memberIds = new Set(request.members.map((member) => member.id));

  return drafts.map((draft) => {
    const kind = draft.kind === 'chore' && !draft.recurrence ? 'todo' : draft.kind;
    const listKind: ListKind = kind === 'grocery' ? 'grocery' : 'todo';
    const category =
      kind !== 'chore' &&
      kind === draft.kind &&
      isCategory(draft.category) &&
      categoriesFor(listKind).includes(draft.category)
        ? draft.category
        : kind === 'chore'
          ? 'general'
          : categorize(draft.title, listKind);
    const rotation = draft.rotation.filter((id) => memberIds.has(id));
    const assigneeId =
      draft.assigneeId && memberIds.has(draft.assigneeId)
        ? draft.assigneeId
        : (rotation[0] ?? null);

    return {
      ...draft,
      kind,
      category,
      assigneeId,
      rotation: kind === 'chore' ? rotation : [],
      recurrence: kind === 'chore' ? draft.recurrence : null,
      quantity: kind === 'grocery' ? draft.quantity : '',
      dueDate:
        kind === 'grocery' ? null : (draft.dueDate ?? (kind === 'chore' ? request.today : null)),
      dueTime: kind === 'grocery' ? null : draft.dueTime,
    };
  });
}
