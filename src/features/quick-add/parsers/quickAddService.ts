import { type QuickAddDraft, type QuickAddRequest } from '../lib/contract';
import { type QuickAddParser } from './QuickAddParser';

export type QuickAddOutcome = {
  drafts: QuickAddDraft[];
  parser: 'local' | 'llm';
  /** True when the LLM was asked but failed and the local parser answered. */
  fellBack: boolean;
};

/**
 * Local first, LLM by choice. The LLM parser is used only when the household
 * has a server with a model configured and the user has not turned it off;
 * any failure falls back to the on-device parser so quick add never breaks.
 */
export function createQuickAddService(local: QuickAddParser, remote: QuickAddParser | null) {
  return {
    async parse(request: QuickAddRequest, signal?: AbortSignal): Promise<QuickAddOutcome> {
      if (remote) {
        try {
          return { drafts: await remote.parse(request, signal), parser: 'llm', fellBack: false };
        } catch {
          return { drafts: await local.parse(request, signal), parser: 'local', fellBack: true };
        }
      }
      return { drafts: await local.parse(request, signal), parser: 'local', fellBack: false };
    },
  };
}
