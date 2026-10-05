/**
 * Fixed-window limiter per client key. Enough to stop one phone in a retry
 * loop from running up an LLM bill; anything stronger belongs in a proxy.
 */
export function createRateLimiter(limit: number, windowMs = 60_000, now: () => number = Date.now) {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    allow(key: string): boolean {
      const t = now();
      const current = windows.get(key);
      if (!current || t - current.start >= windowMs) {
        windows.set(key, { start: t, count: 1 });
        if (windows.size > 10_000) {
          for (const [k, v] of windows) if (t - v.start >= windowMs) windows.delete(k);
        }
        return true;
      }
      current.count += 1;
      return current.count <= limit;
    },
  };
}
