import { draftSchema, quickAddRequestSchema, type QuickAddDraft } from '../contract';
import { sanitizeDrafts } from '../sanitize';

const base: QuickAddDraft = {
  kind: 'grocery',
  title: 'Milk',
  category: 'dairy',
  quantity: '2 L',
  assigneeId: null,
  dueDate: null,
  dueTime: null,
  recurrence: null,
  rotation: [],
  source: 'milk',
};

const request = { today: '2026-10-05', members: [{ id: 'sam', name: 'Sam' }] };

describe('sanitizeDrafts', () => {
  it('clears unknown member ids and rotation entries', () => {
    const [draft] = sanitizeDrafts(
      [
        {
          ...base,
          kind: 'chore',
          category: 'general',
          recurrence: { kind: 'daily', interval: 1 },
          assigneeId: 'ghost',
          rotation: ['ghost', 'sam'],
        },
      ],
      request,
    );
    expect(draft).toMatchObject({ assigneeId: 'sam', rotation: ['sam'], dueDate: '2026-10-05' });
  });

  it('turns a chore without a recurrence into a to-do', () => {
    const [draft] = sanitizeDrafts(
      [{ ...base, kind: 'chore', title: 'Pay rent', category: 'general' }],
      request,
    );
    expect(draft).toMatchObject({
      kind: 'todo',
      category: 'bills',
      recurrence: null,
      quantity: '',
    });
  });

  it('fixes a category that belongs to the other list kind', () => {
    const [draft] = sanitizeDrafts(
      [{ ...base, kind: 'todo', title: 'Call mum', category: 'dairy' }],
      request,
    );
    expect(draft?.category).toBe('admin');
  });

  it('removes dates from groceries', () => {
    const [draft] = sanitizeDrafts([{ ...base, dueDate: '2026-10-09', dueTime: '09:00' }], request);
    expect(draft).toMatchObject({ dueDate: null, dueTime: null, quantity: '2 L' });
  });
});

describe('contract', () => {
  it('validates drafts and requests', () => {
    expect(draftSchema.safeParse(base).success).toBe(true);
    expect(draftSchema.safeParse({ ...base, dueDate: '5/10/2026' }).success).toBe(false);
    expect(draftSchema.safeParse({ ...base, category: 'snacks' }).success).toBe(false);
    expect(
      quickAddRequestSchema.safeParse({
        text: ' ',
        today: '2026-10-05',
        now: '10:00',
        timeZone: 'UTC',
        members: [],
        selfId: null,
      }).success,
    ).toBe(false);
  });
});
