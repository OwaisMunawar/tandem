import { z } from 'zod';

/*
 * The quick-add contract shared by the on-device parser, the app's HTTP
 * client and the sync server's LLM endpoint. Relative imports only: the
 * server bundles this file, so it cannot depend on app path aliases or React
 * Native.
 */
import { recurrenceSchema } from '../../chores/lib/recurrence';
import { ALL_CATEGORIES, type Category } from '../../lists/lib/categories';

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm');

export const draftKinds = ['grocery', 'todo', 'chore'] as const;
export type DraftKind = (typeof draftKinds)[number];

/*
 * Every field is required and nullable rather than optional. Strict
 * structured-output modes reject optional properties, and an explicit null
 * makes "the model saw no date" distinguishable from "the model forgot".
 */
export const draftSchema = z.object({
  kind: z.enum(draftKinds),
  title: z.string().trim().min(1).max(120),
  category: z.enum(ALL_CATEGORIES as [Category, ...Category[]]),
  quantity: z.string().max(40),
  assigneeId: z.string().nullable(),
  dueDate: localDate.nullable(),
  dueTime: localTime.nullable(),
  recurrence: recurrenceSchema.nullable(),
  rotation: z.array(z.string()).max(12),
  source: z.string().max(240),
});

export type QuickAddDraft = z.infer<typeof draftSchema>;

export const draftListSchema = z.object({ drafts: z.array(draftSchema).max(30) });

export const memberRefSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(60),
});

export const quickAddRequestSchema = z.object({
  text: z.string().trim().min(1).max(500),
  today: localDate,
  now: localTime,
  timeZone: z.string().min(1).max(64),
  members: z.array(memberRefSchema).max(20),
  selfId: z.string().nullable(),
});

export type QuickAddRequest = z.infer<typeof quickAddRequestSchema>;
export type MemberRef = z.infer<typeof memberRefSchema>;

export const quickAddResponseSchema = z.object({
  parser: z.enum(['local', 'llm']),
  drafts: z.array(draftSchema).max(30),
});

export type QuickAddResponse = z.infer<typeof quickAddResponseSchema>;
