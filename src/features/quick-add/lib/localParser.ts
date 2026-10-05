import * as chrono from 'chrono-node';

import { formatLocalDate, formatLocalTime, type Weekday } from '../../chores/lib/localDate';
import { firstDueDate, type Recurrence } from '../../chores/lib/recurrence';
import { offsetMinutesAt, zonedToInstant } from '../../chores/lib/zonedTime';
import { categorize } from '../../lists/lib/categories';
import { type MemberRef, type QuickAddDraft, type QuickAddRequest } from './contract';

/*
 * The offline quick-add parser. Deterministic rules, no model: it has to
 * work on a train with no signal and give the same answer every time, which
 * also makes it the reference the LLM parser is compared against.
 *
 * Pipeline per input: split into clauses -> per clause, peel off the
 * assignee, rotation, recurrence and date in that order -> whatever is left
 * is the title -> decide grocery / to-do / chore from what was found.
 */

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  dozen: 12,
  'a dozen': 12,
  'half a dozen': 6,
};

const WEEKDAYS: Record<string, Weekday> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const WEEKDAY =
  '(?:sundays?|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sun|mon|tues?|wed|thu(?:rs?)?|fri|sat)';
const WEEKDAY_LIST = `${WEEKDAY}(?:\\s*(?:,|and|&|/)\\s*${WEEKDAY})*`;
const NUMBER = '(\\d+|two|three|four|five|six|seven|eight|nine|ten)';

/** Phrases that contain "and" but name one thing. */
const COMPOUNDS = [
  'salt and pepper',
  'mac and cheese',
  'fish and chips',
  'bread and butter',
  'oil and vinegar',
];

const ROTATION_RE =
  /\b(?:take turns|taking turns|in turns|rotate|rotating|rotation|alternate|alternating)\b/i;

const TODO_VERBS =
  /^(?:pay|call|ring|phone|email|text|book|fix|repair|clean|renew|schedule|cancel|return|post|send|sign|file|pick up|drop off|collect|water|vacuum|hoover|mop|tidy|sort|organi[sz]e|wash|change|replace|take|check|order|plan|make|empty|defrost|descale|paint|hang|move|bring|buy tickets)\b/i;

const GROCERY_PREFIX = /^(?:buy|get|grab|pick up some|we need|need|more|some)\s+/i;
/** A clause that is only a shopping verb carries nothing to add. */
const BARE_FILLER = /^(?:buy|get|grab|need|some|more|and)$/i;
const FILLER_PREFIX =
  /^(?:remember to|reminder to|don't forget to|dont forget to|need to|needs to|have to|has to|got to|to|please)\s+/i;
const FILLER_SUFFIX = /\s+(?:on|by|at|due|before|from|starting|until|the)$/i;

const UNITS =
  '(kg|g|grams?|l|litres?|liters?|ml|lbs?|oz|packs?|packets?|bottles?|cans?|tins?|jars?|bags?|boxes?|loaf|loaves|bunch(?:es)?|punnets?|pints?|cartons?|rolls?|dozen)';
const UNIT_SHORT: Record<string, string> = {
  grams: 'g',
  gram: 'g',
  litre: 'L',
  litres: 'L',
  liter: 'L',
  liters: 'L',
  l: 'L',
  lb: 'lb',
  lbs: 'lb',
};

type Clause = { text: string };

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function removeSpan(text: string, index: number, length: number): string {
  return collapse(`${text.slice(0, index)} ${text.slice(index + length)}`);
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toNumber(word: string): number | undefined {
  const lower = word.toLowerCase();
  return /^\d+$/.test(lower) ? Number(lower) : NUMBER_WORDS[lower];
}

/** Splits on commas, semicolons and newlines, then on "and" where it joins two things. */
export function splitClauses(input: string): Clause[] {
  const clauses: Clause[] = [];
  for (const rough of input.split(/[\n;,]+/)) {
    const text = collapse(rough);
    if (!text) continue;
    if (ROTATION_RE.test(text)) {
      clauses.push({ text });
      continue;
    }
    const parts = text.split(/\s+(?:and|&|\+)\s+/i);
    let current = parts[0] ?? '';
    for (const next of parts.slice(1)) {
      const lastWord = current.split(' ').pop() ?? '';
      const firstWord = next.split(' ')[0] ?? '';
      const joined = `${lastWord} and ${firstWord}`.toLowerCase();
      const bothWeekdays =
        new RegExp(`^${WEEKDAY}$`, 'i').test(lastWord) &&
        new RegExp(`^${WEEKDAY}$`, 'i').test(firstWord);
      const compound = COMPOUNDS.some((phrase) => joined.length > 0 && phrase.includes(joined));
      if (bothWeekdays || compound) {
        current = `${current} and ${next}`;
      } else {
        clauses.push({ text: current });
        current = next;
      }
    }
    if (current) clauses.push({ text: current });
  }
  return clauses;
}

function nameIndex(members: readonly MemberRef[]): Map<string, string> {
  const index = new Map<string, string>();
  const firstNames = new Map<string, string[]>();
  for (const member of members) {
    const full = member.name.trim().toLowerCase();
    index.set(full, member.id);
    const first = full.split(/\s+/)[0];
    if (first) firstNames.set(first, [...(firstNames.get(first) ?? []), member.id]);
  }
  // A first name only resolves when exactly one member has it.
  for (const [first, ids] of firstNames) {
    if (ids.length === 1 && ids[0] && !index.has(first)) index.set(first, ids[0]);
  }
  return index;
}

type Peeled<T> = { value: T; rest: string };

const ASSIGNEE_VERBS =
  '(?:does|do|will do|will|is doing|to do|to|should|needs to|has to|can do|can|takes)';

function peelAssignee(
  text: string,
  names: Map<string, string>,
  selfId: string | null,
): Peeled<string | null> {
  const selfWords = selfId ? ['me', 'i', "i'll", 'myself'] : [];
  const lookup = (raw: string) => {
    const name = raw.toLowerCase().replace(/^@/, '');
    if (selfId && selfWords.includes(name)) return selfId;
    return names.get(name) ?? null;
  };
  // Longest names first, so "Sam Okafor" is tried before "Sam".
  const alternatives = [...names.keys(), ...selfWords]
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join('|');
  if (!alternatives) return { value: null, rest: text };

  const patterns = [
    new RegExp(`^@?(${alternatives})\\s*(?::|-|–)\\s*(.+)$`, 'iu'),
    new RegExp(`^@?(${alternatives})\\s+${ASSIGNEE_VERBS}\\s+(.+)$`, 'iu'),
  ];
  for (const pattern of patterns) {
    const leading = pattern.exec(text);
    const id = leading?.[1] ? lookup(leading[1]) : null;
    if (id && leading?.[2]) return { value: id, rest: collapse(leading[2]) };
  }

  const trailing = new RegExp(
    `^(.+?)\\s+(?:for|by|with|assigned to|->)\\s+@?(${alternatives})$`,
    'iu',
  ).exec(text);
  if (trailing?.[1] && trailing[2]) {
    const id = lookup(trailing[2]);
    if (id) return { value: id, rest: collapse(trailing[1]) };
  }

  const mention = new RegExp(`(^|\\s)@(${alternatives})\\b`, 'iu').exec(text);
  if (mention?.[2]) {
    const id = lookup(mention[2]);
    if (id) return { value: id, rest: removeSpan(text, mention.index, mention[0].length) };
  }

  return { value: null, rest: text };
}

function peelRotation(text: string, names: Map<string, string>, members: readonly MemberRef[]) {
  const match = ROTATION_RE.exec(text);
  if (!match) return { value: [] as string[], rest: text };

  // Rotation order follows the order names were said in.
  const rest0 = removeSpan(text, match.index, match[0].length);
  const found: { id: string; at: number; re: RegExp }[] = [];
  for (const [name, id] of names) {
    const re = new RegExp(`\\b${escape(name)}\\b`, 'i');
    const hit = re.exec(rest0);
    if (hit && !found.some((entry) => entry.id === id)) found.push({ id, at: hit.index, re });
  }
  found.sort((a, b) => a.at - b.at);
  let rest = rest0;
  for (const entry of found) rest = collapse(rest.replace(entry.re, ' '));
  const mentioned = found.map((entry) => entry.id);
  rest = collapse(
    rest.replace(/^(?:(?:and|&|,|between)\s+)+/i, '').replace(/^(?:doing|on|at|with)\s+/i, ''),
  );
  return { value: mentioned.length >= 2 ? mentioned : members.map((m) => m.id), rest };
}

type RecurrenceRule = {
  re: RegExp;
  build: (match: RegExpExecArray) => Recurrence | null;
  time?: string;
};

const RECURRENCE_RULES: RecurrenceRule[] = [
  { re: /\b(?:every|each)\s+other\s+day\b/i, build: () => ({ kind: 'daily', interval: 2 }) },
  {
    re: new RegExp(`\\bevery\\s+${NUMBER}\\s+days\\b`, 'i'),
    build: (m) => ({ kind: 'daily', interval: toNumber(m[1] ?? '') ?? 1 }),
  },
  {
    re: /\b(?:(?:every|each)\s+other\s+week|fortnightly|bi-?weekly|every\s+(?:2|two)\s+weeks)\b/i,
    build: () => ({ kind: 'weekly', interval: 2 }),
  },
  {
    re: new RegExp(`\\bevery\\s+${NUMBER}\\s+weeks\\b`, 'i'),
    build: (m) => ({ kind: 'weekly', interval: toNumber(m[1] ?? '') ?? 1 }),
  },
  {
    re: /\b(?:(?:every|each|on)\s+weekdays?|weekdays)\b/i,
    build: () => ({ kind: 'days', days: [1, 2, 3, 4, 5] }),
  },
  {
    re: /\b(?:(?:every|each|on)\s+weekends?|weekends)\b/i,
    build: () => ({ kind: 'days', days: [0, 6] }),
  },
  {
    // "every Monday", "each tue and thu", or a plural on its own ("mondays").
    re: new RegExp(
      `\\b(?:(?:every|each)\\s+(${WEEKDAY_LIST})|(?:on\\s+)?((?:${WEEKDAY}s)(?:\\s*(?:,|and|&|/)\\s*${WEEKDAY})*))\\b`,
      'i',
    ),
    build: (m) => {
      const list = m[1] ?? m[2] ?? '';
      const days = [...list.toLowerCase().matchAll(new RegExp(WEEKDAY, 'gi'))]
        .map((day) => WEEKDAYS[day[0].replace(/s$/, '')] ?? WEEKDAYS[day[0]])
        .filter((day): day is Weekday => day !== undefined);
      return days.length > 0 ? { kind: 'days', days: [...new Set(days)].sort() } : null;
    },
  },
  { re: /\bevery\s+morning\b/i, build: () => ({ kind: 'daily', interval: 1 }), time: '08:00' },
  {
    re: /\b(?:every\s+(?:evening|night)|nightly)\b/i,
    build: () => ({ kind: 'daily', interval: 1 }),
    time: '20:00',
  },
  {
    re: /\b(?:daily|every\s*day|each\s*day|once\s+a\s+day)\b/i,
    build: () => ({ kind: 'daily', interval: 1 }),
  },
  {
    re: /\b(?:weekly|every\s+week|each\s+week|once\s+a\s+week)\b/i,
    build: () => ({ kind: 'weekly', interval: 1 }),
  },
];

function peelRecurrence(text: string): Peeled<{ rule: Recurrence; time?: string } | null> {
  for (const rule of RECURRENCE_RULES) {
    const match = rule.re.exec(text);
    if (!match) continue;
    const built = rule.build(match);
    if (built) {
      return {
        value: { rule: built, ...(rule.time ? { time: rule.time } : {}) },
        rest: removeSpan(text, match.index, match[0].length),
      };
    }
  }
  return { value: null, rest: text };
}

type ParsedDate = { date: string | null; time: string | null };

function peelDate(text: string, request: QuickAddRequest): Peeled<ParsedDate> {
  const instant = zonedToInstant(request.today, request.now, request.timeZone);
  const reference = {
    instant: new Date(instant),
    timezone: offsetMinutesAt(instant, request.timeZone),
  };
  const [result] = chrono.casual.parse(text, reference, { forwardDate: true });
  if (!result) return { value: { date: null, time: null }, rest: text };

  const start = result.start;
  const hasDay =
    start.isCertain('day') ||
    start.isCertain('weekday') ||
    /\b(?:today|tonight|tomorrow|week|month)\b/i.test(result.text);
  const hasTime = start.isCertain('hour');
  const date =
    hasDay || hasTime
      ? formatLocalDate(start.get('year') ?? 1970, start.get('month') ?? 1, start.get('day') ?? 1)
      : null;
  const time = hasTime ? formatLocalTime(start.get('hour') ?? 9, start.get('minute') ?? 0) : null;

  return {
    value: { date: hasDay ? date : null, time },
    rest: removeSpan(text, result.index, result.text.length),
  };
}

function parseQuantity(text: string): { quantity: string; title: string } {
  const leading = new RegExp(
    `^(half a dozen|a dozen|\\d+(?:\\.\\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen)\\s*(?:x\\s+)?(?:${UNITS}\\b\\.?)?\\s*(?:of\\s+)?(.+)$`,
    'i',
  ).exec(text);
  if (leading?.[1] && leading[3]) {
    const amount = /^\d/.test(leading[1])
      ? leading[1]
      : String(NUMBER_WORDS[leading[1].toLowerCase()] ?? '');
    const unitRaw = leading[2]?.toLowerCase();
    if (unitRaw === 'dozen') return { quantity: String(Number(amount) * 12), title: leading[3] };
    const unit = unitRaw ? (UNIT_SHORT[unitRaw] ?? unitRaw) : '';
    const isArticleOnly = !unitRaw && /^(?:an?|one)$/i.test(leading[1]);
    if (isArticleOnly) return { quantity: '', title: leading[3] };
    return { quantity: collapse(`${amount} ${unit}`), title: leading[3] };
  }
  const trailing = /^(.+?)\s*(?:x\s*(\d+)|\((\d+)\))$/i.exec(text);
  if (trailing?.[1]) return { quantity: trailing[2] ?? trailing[3] ?? '', title: trailing[1] };
  return { quantity: '', title: text };
}

function cleanTitle(text: string): string {
  let title = collapse(text);
  for (let i = 0; i < 3; i += 1) {
    title = title.replace(FILLER_PREFIX, '').replace(FILLER_SUFFIX, '');
  }
  return capitalise(title.replace(/^[\s\-–:.,!]+|[\s\-–:.,!]+$/g, ''));
}

function parseClause(
  clause: Clause,
  request: QuickAddRequest,
  names: Map<string, string>,
): QuickAddDraft | null {
  const source = clause.text;
  const assignee = peelAssignee(source, names, request.selfId);
  const rotation = peelRotation(assignee.rest, names, request.members);
  const recurrence = peelRecurrence(rotation.rest);
  const dated = peelDate(recurrence.rest, request);
  const remainder = dated.rest;

  const kind: QuickAddDraft['kind'] =
    recurrence.value || rotation.value.length > 0
      ? 'chore'
      : dated.value.date ||
          dated.value.time ||
          TODO_VERBS.test(cleanTitle(remainder)) ||
          assignee.value
        ? 'todo'
        : 'grocery';

  if (kind === 'grocery') {
    let stripped = remainder;
    while (GROCERY_PREFIX.test(stripped)) stripped = stripped.replace(GROCERY_PREFIX, '');
    const { quantity, title } = parseQuantity(cleanTitle(stripped));
    const finalTitle = cleanTitle(title);
    if (!finalTitle || BARE_FILLER.test(finalTitle)) return null;
    return {
      kind,
      title: finalTitle,
      category: categorize(finalTitle, 'grocery'),
      quantity,
      assigneeId: null,
      dueDate: null,
      dueTime: null,
      recurrence: null,
      rotation: [],
      source,
    };
  }

  const title = cleanTitle(remainder);
  if (!title) return null;

  if (kind === 'chore') {
    const rule = recurrence.value?.rule ?? { kind: 'daily', interval: 1 };
    return {
      kind,
      title,
      category: 'general',
      quantity: '',
      assigneeId: assignee.value ?? rotation.value[0] ?? null,
      dueDate: dated.value.date ?? firstDueDate(rule, request.today),
      dueTime: dated.value.time ?? recurrence.value?.time ?? '09:00',
      recurrence: rule,
      rotation: rotation.value,
      source,
    };
  }

  return {
    kind,
    title,
    category: categorize(title, 'todo'),
    quantity: '',
    assigneeId: assignee.value,
    dueDate: dated.value.date ?? (dated.value.time ? request.today : null),
    dueTime: dated.value.time ?? (dated.value.date ? '09:00' : null),
    recurrence: null,
    rotation: [],
    source,
  };
}

export function parseQuickAdd(request: QuickAddRequest): QuickAddDraft[] {
  const names = nameIndex(request.members);
  return splitClauses(request.text)
    .map((clause) => parseClause(clause, request, names))
    .filter((draft): draft is QuickAddDraft => draft !== null);
}
