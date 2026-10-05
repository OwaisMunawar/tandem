import { type HouseholdStore } from '@/core/store/types';
import { addDays, type LocalDate } from '@/features/chores/lib/localDate';
import { encodeRecurrence, type Recurrence } from '@/features/chores/lib/recurrence';
import { encodeRotation } from '@/features/chores/lib/rotation';
import { zonedToInstant } from '@/features/chores/lib/zonedTime';
import { type Category } from '@/features/lists/lib/categories';

/**
 * A fictional household for demo builds and screenshots. Ids are fixed so
 * screenshots and Maestro flows can address rows; dates are relative to
 * today so the chores screen always has something overdue, due and upcoming.
 */
export const DEMO_HOUSEHOLD = 'The Okafor-Lindqvist flat';

export const DEMO_MEMBERS = {
  ngozi: { name: 'Ngozi Okafor', color: '#1F7A63' },
  linnea: { name: 'Linnea Lindqvist', color: '#E0573F' },
  sam: { name: 'Sam Reyes', color: '#3A78C9' },
} as const;

export type DemoMemberId = keyof typeof DEMO_MEMBERS;

type GroceryRow = [title: string, category: Category, quantity: string, done?: boolean];

const GROCERIES: GroceryRow[] = [
  ['Plantain', 'produce', '4'],
  ['Spinach', 'produce', '1 bag'],
  ['Lemons', 'produce', '3'],
  ['Sourdough', 'bakery', '1 loaf'],
  ['Oat milk', 'dairy', '2 L'],
  ['Eggs', 'dairy', '12'],
  ['Feta', 'dairy', ''],
  ['Chicken thighs', 'meat', '1 kg'],
  ['Basmati rice', 'pantry', '2 kg'],
  ['Scotch bonnet sauce', 'pantry', ''],
  ['Coffee beans', 'pantry', '', true],
  ['Frozen peas', 'frozen', ''],
  ['Washing-up liquid', 'household', '', true],
  ['Toothpaste', 'personal', ''],
];

type TodoRow = [
  title: string,
  category: Category,
  assignee: DemoMemberId | '',
  dueInDays: number | null,
  done?: boolean,
];

const TODOS: TodoRow[] = [
  ['Pay rent', 'bills', 'linnea', 4],
  ['Renew contents insurance', 'bills', 'ngozi', 9],
  ['Return library books', 'errands', 'sam', 1],
  ['Fix the bathroom tap', 'home', 'sam', null],
  ['Book boiler service', 'admin', 'ngozi', 2],
  ['Order a new kettle', 'general', '', null, true],
];

type ChoreRow = [
  title: string,
  recurrence: Recurrence,
  assignee: DemoMemberId,
  rotation: DemoMemberId[],
  dueInDays: number,
  dueTime: string,
];

const CHORES: ChoreRow[] = [
  ['Dishes', { kind: 'daily', interval: 1 }, 'sam', ['sam', 'linnea', 'ngozi'], 0, '20:00'],
  ['Take out the bins', { kind: 'days', days: [1, 4] }, 'linnea', ['linnea', 'sam'], -1, '19:00'],
  [
    'Hoover the living room',
    { kind: 'weekly', interval: 1 },
    'ngozi',
    ['ngozi', 'linnea', 'sam'],
    0,
    '10:00',
  ],
  ['Water the plants', { kind: 'daily', interval: 3 }, 'linnea', [], 1, '09:00'],
  ['Clean the bathroom', { kind: 'weekly', interval: 1 }, 'sam', ['sam', 'ngozi'], 2, '11:00'],
  ['Change the bed sheets', { kind: 'weekly', interval: 2 }, 'ngozi', [], 5, '10:00'],
];

export function seedDemoHousehold(
  store: HouseholdStore,
  context: { today: LocalDate; timeZone: string; now: number },
): { founderId: DemoMemberId } {
  const { today, timeZone, now } = context;
  store.transaction(() => {
    store.setValues({ householdName: DEMO_HOUSEHOLD, timeZone, createdAt: now - 40 * 86_400_000 });

    Object.entries(DEMO_MEMBERS).forEach(([id, member], index) => {
      store.setRow('members', id, { ...member, joinedAt: now - (40 - index) * 86_400_000 });
    });

    store.setRow('lists', 'groceries', {
      name: 'Groceries',
      kind: 'grocery',
      position: 1,
      createdAt: now,
    });
    store.setRow('lists', 'todos', { name: 'To-dos', kind: 'todo', position: 2, createdAt: now });

    GROCERIES.forEach(([title, category, quantity, done = false], index) => {
      store.setRow('items', `g${index + 1}`, {
        listId: 'groceries',
        title,
        category,
        quantity,
        done,
        position: (index + 1) * 1024,
        createdAt: now - index * 60_000,
        createdBy: index % 2 === 0 ? 'ngozi' : 'linnea',
        completedAt: done ? now - index * 600_000 : 0,
      });
    });

    TODOS.forEach(([title, category, assignee, dueInDays, done = false], index) => {
      store.setRow('items', `t${index + 1}`, {
        listId: 'todos',
        title,
        category,
        assigneeId: assignee,
        dueAt:
          dueInDays === null ? 0 : zonedToInstant(addDays(today, dueInDays), '09:00', timeZone),
        done,
        position: (index + 1) * 1024,
        createdAt: now - index * 60_000,
        createdBy: 'ngozi',
        completedAt: done ? now - 3_600_000 : 0,
      });
    });

    CHORES.forEach(([title, recurrence, assignee, rotation, dueInDays, dueTime], index) => {
      store.setRow('chores', `c${index + 1}`, {
        title,
        assigneeId: assignee,
        rotation: encodeRotation(rotation),
        recurrence: encodeRecurrence(recurrence),
        dueDate: addDays(today, dueInDays),
        dueTime,
        createdAt: now - 30 * 86_400_000,
        lastDoneAt: index === 2 ? now - 7 * 86_400_000 : 0,
        lastDoneBy: index === 2 ? 'linnea' : '',
      });
    });
  });
  return { founderId: 'ngozi' };
}
