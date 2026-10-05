import { memberColors } from '../../../core/theme/tokens';

export type Member = {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
  leftAt: number;
};

/** The first colour nobody in the household is using, cycling once all are taken. */
export function nextMemberColor(taken: readonly string[]): string {
  const used = new Set(taken.map((color) => color.toUpperCase()));
  return (
    memberColors.find((color) => !used.has(color.toUpperCase())) ??
    memberColors[taken.length % memberColors.length] ??
    memberColors[0]
  );
}

export function normaliseMemberName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 40);
}

export function sortMembers<T extends Pick<Member, 'joinedAt' | 'name'>>(
  members: readonly T[],
): T[] {
  return [...members].sort((a, b) => a.joinedAt - b.joinedAt || a.name.localeCompare(b.name));
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
