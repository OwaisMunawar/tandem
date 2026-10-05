import { useEffect, useState } from 'react';

/**
 * A clock that re-renders on an interval. Presence expiry and "due today"
 * are both functions of time, and nothing else would trigger a re-render
 * when a heartbeat simply goes stale.
 */
export function useNow(intervalMs: number, now: () => number = Date.now): number {
  const [value, setValue] = useState(now);
  useEffect(() => {
    const timer = setInterval(() => setValue(now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, now]);
  return value;
}
