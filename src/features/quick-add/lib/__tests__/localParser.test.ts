import { type QuickAddRequest } from '../contract';
import { parseQuickAdd, splitClauses } from '../localParser';

const members = [
  { id: 'ngozi', name: 'Ngozi Okafor' },
  { id: 'linnea', name: 'Linnea Lindqvist' },
  { id: 'sam', name: 'Sam Reyes' },
];

// Monday 5 October 2026, mid-morning in London.
const request = (text: string, patch: Partial<QuickAddRequest> = {}): QuickAddRequest => ({
  text,
  today: '2026-10-05',
  now: '10:00',
  timeZone: 'Europe/London',
  members,
  selfId: 'ngozi',
  ...patch,
});

const parse = (text: string, patch?: Partial<QuickAddRequest>) =>
  parseQuickAdd(request(text, patch));

describe('local quick-add parser', () => {
  it('handles the headline example', () => {
    const drafts = parse('milk, eggs and pay rent Friday, Sam does dishes daily');
    expect(drafts).toHaveLength(4);
    expect(drafts[0]).toMatchObject({ kind: 'grocery', title: 'Milk', category: 'dairy' });
    expect(drafts[1]).toMatchObject({ kind: 'grocery', title: 'Eggs', category: 'dairy' });
    expect(drafts[2]).toMatchObject({
      kind: 'todo',
      title: 'Pay rent',
      category: 'bills',
      dueDate: '2026-10-09',
      dueTime: '09:00',
    });
    expect(drafts[3]).toMatchObject({
      kind: 'chore',
      title: 'Dishes',
      assigneeId: 'sam',
      recurrence: { kind: 'daily', interval: 1 },
      dueDate: '2026-10-05',
    });
  });

  it('reads quantities and units', () => {
    const drafts = parse(
      '2 litres of milk, a dozen eggs, bread x2, 500g mince, three lemons, an avocado',
    );
    expect(drafts.map((d) => [d.title, d.quantity])).toEqual([
      ['Milk', '2 L'],
      ['Eggs', '12'],
      ['Bread', '2'],
      ['Mince', '500 g'],
      ['Lemons', '3'],
      ['Avocado', ''],
    ]);
  });

  it('strips shopping verbs from groceries', () => {
    expect(parse('buy some oat milk')[0]).toMatchObject({ kind: 'grocery', title: 'Oat milk' });
    expect(parse('get bananas (6)')[0]).toMatchObject({ title: 'Bananas', quantity: '6' });
  });

  it('keeps compound groceries together', () => {
    expect(parse('salt and pepper, mac and cheese').map((d) => d.title)).toEqual([
      'Salt and pepper',
      'Mac and cheese',
    ]);
  });

  it('understands custom weekdays without splitting on their "and"', () => {
    const [bins] = parse('bins every monday and thursday at 7pm');
    expect(bins).toMatchObject({
      kind: 'chore',
      title: 'Bins',
      recurrence: { kind: 'days', days: [1, 4] },
      dueDate: '2026-10-05',
      dueTime: '19:00',
    });
    expect(parse('recycling on tuesdays')[0]).toMatchObject({
      recurrence: { kind: 'days', days: [2] },
      dueDate: '2026-10-06',
    });
  });

  it.each([
    ['plants every other day', { kind: 'daily', interval: 2 }],
    ['plants every 3 days', { kind: 'daily', interval: 3 }],
    ['towels weekly', { kind: 'weekly', interval: 1 }],
    ['sheets fortnightly', { kind: 'weekly', interval: 2 }],
    ['deep clean every four weeks', { kind: 'weekly', interval: 4 }],
    ['school run every weekday', { kind: 'days', days: [1, 2, 3, 4, 5] }],
    ['big shop on weekends', { kind: 'days', days: [0, 6] }],
  ])('%s', (text, recurrence) => {
    expect(parse(text)[0]?.recurrence).toEqual(recurrence);
  });

  it('gives morning and evening chores sensible times', () => {
    expect(parse('feed the cat every morning')[0]).toMatchObject({ dueTime: '08:00' });
    expect(parse('lock up every night')[0]).toMatchObject({ dueTime: '20:00' });
  });

  it('builds rotations in the order people are named', () => {
    const [chore] = parse('Linnea and Sam take turns hoovering weekly');
    expect(chore).toMatchObject({
      kind: 'chore',
      title: 'Hoovering',
      rotation: ['linnea', 'sam'],
      assigneeId: 'linnea',
    });
  });

  it('rotates through everyone when nobody is named', () => {
    expect(parse('rotate bathroom cleaning weekly')[0]?.rotation).toEqual([
      'ngozi',
      'linnea',
      'sam',
    ]);
  });

  it('finds assignees in several phrasings', () => {
    expect(parse('Linnea: book the vet')[0]).toMatchObject({
      kind: 'todo',
      assigneeId: 'linnea',
      title: 'Book the vet',
    });
    expect(parse('call landlord for Sam')[0]).toMatchObject({
      assigneeId: 'sam',
      title: 'Call landlord',
    });
    expect(parse('dentist tomorrow at 3pm for me')[0]).toMatchObject({
      assigneeId: 'ngozi',
      dueDate: '2026-10-06',
      dueTime: '15:00',
      category: 'admin',
    });
    expect(parse('@sam water the plants')[0]).toMatchObject({ assigneeId: 'sam' });
  });

  it('ignores names that are not household members', () => {
    expect(parse('Bob: buy a ladder')[0]?.assigneeId).toBeNull();
    expect(parse('pay rent by Friday')[0]).toMatchObject({
      assigneeId: null,
      dueDate: '2026-10-09',
    });
  });

  it('only resolves a first name when it is unambiguous', () => {
    const twoSams = [...members, { id: 'sam2', name: 'Sam Okafor' }];
    expect(parse('Sam: fix the shelf', { members: twoSams })[0]?.assigneeId).toBeNull();
    expect(parse('Sam Okafor: fix the shelf', { members: twoSams })[0]?.assigneeId).toBe('sam2');
  });

  it('turns task verbs into to-dos even without a date', () => {
    expect(parse('call the plumber')[0]).toMatchObject({
      kind: 'todo',
      dueDate: null,
      dueTime: null,
    });
    expect(parse('renew passport')[0]).toMatchObject({ kind: 'todo', category: 'admin' });
  });

  it('treats a bare time as today', () => {
    expect(parse('pick up parcel at 5pm')[0]).toMatchObject({
      dueDate: '2026-10-05',
      dueTime: '17:00',
    });
  });

  it('resolves relative dates in the household zone, not the device zone', () => {
    // 23:30 on Monday in Los Angeles is already Tuesday in Tokyo.
    const tokyo = parse('pay rent tomorrow', {
      today: '2026-10-06',
      now: '15:30',
      timeZone: 'Asia/Tokyo',
    });
    expect(tokyo[0]?.dueDate).toBe('2026-10-07');
  });

  it('drops empty fragments', () => {
    expect(parse(' , ; \n ')).toEqual([]);
    expect(parse('buy')).toEqual([]);
  });

  it('splits on newlines and semicolons', () => {
    expect(splitClauses('milk\neggs; bread').map((c) => c.text)).toEqual(['milk', 'eggs', 'bread']);
  });
});
