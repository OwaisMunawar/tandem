import { type QuickAddDraft, type QuickAddRequest } from '../lib/contract';

/**
 * Both parsers return the same drafts, and neither writes anything: the
 * preview sheet shows the drafts and the user confirms before they reach the
 * household. That keeps a wrong guess, local or LLM, a one-tap fix.
 */
export interface QuickAddParser {
  readonly kind: 'local' | 'llm';
  parse(request: QuickAddRequest, signal?: AbortSignal): Promise<QuickAddDraft[]>;
}
