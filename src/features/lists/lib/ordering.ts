/**
 * Fractional positions. A move writes one cell on one row, so two phones
 * reordering different items offline never touch the same cell and both
 * moves survive the merge. Concurrent moves of the same item resolve to the
 * later one, which is what people expect.
 */

const STEP = 1024;

export function positionAtEnd(positions: readonly number[]): number {
  return positions.length === 0 ? STEP : Math.max(...positions) + STEP;
}

export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return STEP;
  if (before === undefined) return (after as number) - STEP;
  if (after === undefined) return before + STEP;
  return (before + after) / 2;
}

/**
 * Doubles run out of room after ~50 halvings between the same two
 * neighbours. When a gap gets that small the caller renumbers the list.
 */
export function needsRenumber(before: number | undefined, after: number | undefined): boolean {
  return before !== undefined && after !== undefined && Math.abs(after - before) < 1e-6;
}

export function renumber<T extends { id: string }>(ordered: readonly T[]): Map<string, number> {
  return new Map(ordered.map((entry, index) => [entry.id, (index + 1) * STEP]));
}

/**
 * Position for moving `id` one slot up or down among `ordered` (already
 * sorted). Returns undefined when the item is already at that edge.
 */
export function positionForStep<T extends { id: string; position: number }>(
  ordered: readonly T[],
  id: string,
  direction: -1 | 1,
): number | undefined {
  const index = ordered.findIndex((entry) => entry.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= ordered.length) return undefined;
  const neighbour = ordered[target];
  const beyond = ordered[target + direction];
  return direction === -1
    ? positionBetween(beyond?.position, neighbour?.position)
    : positionBetween(neighbour?.position, beyond?.position);
}
