/**
 * Who gets a chore next. The rotation is an ordered list of member ids; a
 * member who has left the household is skipped rather than removed, so
 * rotations written by another phone stay valid while that phone is offline.
 */
export function nextAssignee(
  rotation: readonly string[],
  current: string,
  activeMemberIds: ReadonlySet<string>,
): string {
  const eligible = rotation.filter((id) => activeMemberIds.has(id));
  if (eligible.length === 0) return activeMemberIds.has(current) ? current : '';

  const index = rotation.indexOf(current);
  if (index === -1) return eligible[0] ?? '';

  for (let step = 1; step <= rotation.length; step += 1) {
    const candidate = rotation[(index + step) % rotation.length];
    if (candidate !== undefined && activeMemberIds.has(candidate)) return candidate;
  }
  /* istanbul ignore next -- eligible is non-empty, so the loop always returns */
  return current;
}

export function encodeRotation(rotation: readonly string[]): string {
  return JSON.stringify([...new Set(rotation)]);
}

export function decodeRotation(encoded: string): string[] {
  try {
    const parsed: unknown = JSON.parse(encoded);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}
