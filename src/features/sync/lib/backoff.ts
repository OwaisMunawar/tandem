export type BackoffOptions = { baseMs: number; maxMs: number };

export const DEFAULT_BACKOFF: BackoffOptions = { baseMs: 500, maxMs: 30_000 };

/**
 * Exponential backoff with full jitter. When a server restarts, every phone
 * in every household reconnects at once; jitter spreads that thundering herd
 * out instead of synchronising it.
 */
export function backoffDelay(
  attempt: number,
  options: BackoffOptions = DEFAULT_BACKOFF,
  random: () => number = Math.random,
): number {
  const ceiling = Math.min(options.maxMs, options.baseMs * 2 ** Math.max(0, attempt));
  // Never zero: a tight loop against a refusing server burns battery.
  return Math.max(options.baseMs / 2, Math.round(random() * ceiling));
}
