import { generateText, Output, type LanguageModel } from 'ai';

import {
  draftListSchema,
  quickAddRequestSchema,
  type QuickAddRequest,
  type QuickAddResponse,
} from '../../src/features/quick-add/lib/contract';
import { sanitizeDrafts } from '../../src/features/quick-add/lib/sanitize';

export class QuickAddError extends Error {
  constructor(
    readonly status: 400 | 413 | 502,
    message: string,
  ) {
    super(message);
  }
}

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function buildInstructions(request: QuickAddRequest): string {
  const [y, m, d] = request.today.split('-').map(Number) as [number, number, number];
  const weekday = weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const members = request.members.map((member) => `- ${member.name} (id: ${member.id})`).join('\n');
  return [
    'You turn one line of household shorthand into separate drafts for a shared household planner.',
    `Today is ${weekday} ${request.today}, local time ${request.now}, time zone ${request.timeZone}.`,
    'Household members:',
    members || '- (none)',
    request.selfId ? `The person typing has id ${request.selfId}; "me" or "I" means them.` : '',
    'Rules:',
    '- kind "grocery" for things to buy, "todo" for one-off tasks, "chore" only for repeating tasks.',
    '- Every chore needs a recurrence: daily {interval}, weekly {interval}, or days {days: 0=Sunday..6=Saturday}.',
    '- Grocery categories: produce, bakery, dairy, meat, pantry, frozen, drinks, household, personal, other.',
    '- To-do categories: bills, errands, home, admin, general. Chores use "general".',
    '- assigneeId and rotation must use the member ids above, never names. Use null when nobody is named.',
    '- "take turns" or "rotate" means rotation lists the members in the order mentioned, or everyone.',
    '- Dates are YYYY-MM-DD and times HH:mm in the household time zone. Resolve "Friday" to the next Friday.',
    '- Titles are short and capitalised, without the date, assignee or recurrence words.',
    '- quantity is free text like "2 L" or "6", or an empty string.',
    '- source is the fragment of the input the draft came from.',
    'Never invent items that were not mentioned.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Structured output via generateText + Output.object, validated by the same
 * zod schema the app uses. The result is sanitised before it leaves the
 * server, and the app sanitises it again: neither side trusts the model.
 */
export async function parseWithModel(
  body: unknown,
  model: LanguageModel,
): Promise<QuickAddResponse> {
  const parsed = quickAddRequestSchema.safeParse(body);
  if (!parsed.success) throw new QuickAddError(400, 'Invalid quick add request.');
  const request = parsed.data;

  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema: draftListSchema, name: 'household_drafts' }),
      instructions: buildInstructions(request),
      prompt: request.text,
      temperature: 0,
      maxRetries: 1,
    });
    return { parser: 'llm', drafts: sanitizeDrafts(output.drafts, request) };
  } catch (error) {
    throw new QuickAddError(502, error instanceof Error ? error.message : 'The model call failed.');
  }
}
