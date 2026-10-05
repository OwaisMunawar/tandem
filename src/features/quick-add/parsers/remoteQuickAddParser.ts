import { TandemError } from '../../../core/errors/TandemError';
import { quickAddResponseSchema } from '../lib/contract';
import { sanitizeDrafts } from '../lib/sanitize';
import { type QuickAddParser } from './QuickAddParser';

type Fetch = typeof fetch;

/**
 * Calls the sync server's optional LLM endpoint. The response is validated
 * against the same zod contract the server used, then sanitised again here:
 * the client never trusts that the server (or its model) behaved.
 */
export function createRemoteQuickAddParser(
  httpBase: string,
  options: { fetch?: Fetch; timeoutMs?: number } = {},
): QuickAddParser {
  const doFetch = options.fetch ?? fetch;
  return {
    kind: 'llm',
    async parse(request, signal) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
      signal?.addEventListener('abort', () => controller.abort());
      try {
        const response = await doFetch(`${httpBase}/v1/quick-add`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new TandemError(
            'QUICK_ADD_UNAVAILABLE',
            `Quick add server returned ${response.status}.`,
          );
        }
        const parsed = quickAddResponseSchema.safeParse(await response.json());
        if (!parsed.success) {
          throw new TandemError(
            'QUICK_ADD_INVALID_RESPONSE',
            'Quick add server sent an unexpected response.',
            {
              cause: parsed.error,
            },
          );
        }
        return sanitizeDrafts(parsed.data.drafts, request);
      } catch (error) {
        if (error instanceof TandemError) throw error;
        throw new TandemError('QUICK_ADD_UNAVAILABLE', 'Could not reach the quick add server.', {
          cause: error,
        });
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/** Whether the server has an LLM configured. Any failure means "no". */
export async function fetchQuickAddCapability(
  httpBase: string,
  doFetch: Fetch = fetch,
): Promise<boolean> {
  try {
    const response = await doFetch(`${httpBase}/v1/capabilities`);
    if (!response.ok) return false;
    const body: unknown = await response.json();
    return (
      typeof body === 'object' &&
      body !== null &&
      (body as { quickAddLlm?: unknown }).quickAddLlm === true
    );
  } catch {
    return false;
  }
}
