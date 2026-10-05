/**
 * Categories group a list the way people walk a shop or plan a week. The
 * order here is the display order: produce first because most stores put it
 * at the entrance.
 */
export const GROCERY_CATEGORIES = [
  'produce',
  'bakery',
  'dairy',
  'meat',
  'pantry',
  'frozen',
  'drinks',
  'household',
  'personal',
  'other',
] as const;

export const TODO_CATEGORIES = ['bills', 'errands', 'home', 'admin', 'general'] as const;

export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number];
export type TodoCategory = (typeof TODO_CATEGORIES)[number];
export type Category = GroceryCategory | TodoCategory;
export type ListKind = 'grocery' | 'todo';

export const ALL_CATEGORIES: readonly Category[] = [...GROCERY_CATEGORIES, ...TODO_CATEGORIES];

export const CATEGORY_LABELS: Record<Category, string> = {
  produce: 'Fruit & veg',
  bakery: 'Bakery',
  dairy: 'Dairy & eggs',
  meat: 'Meat & fish',
  pantry: 'Pantry',
  frozen: 'Frozen',
  drinks: 'Drinks',
  household: 'Household',
  personal: 'Personal care',
  other: 'Other',
  bills: 'Bills',
  errands: 'Errands',
  home: 'Around the house',
  admin: 'Admin',
  general: 'General',
};

export function isCategory(value: string): value is Category {
  return (ALL_CATEGORIES as readonly string[]).includes(value);
}

export function categoriesFor(kind: ListKind): readonly Category[] {
  return kind === 'grocery' ? GROCERY_CATEGORIES : TODO_CATEGORIES;
}

export function defaultCategory(kind: ListKind): Category {
  return kind === 'grocery' ? 'other' : 'general';
}

const GROCERY_KEYWORDS: Record<Exclude<GroceryCategory, 'other'>, readonly string[]> = {
  produce: [
    'apple',
    'banana',
    'orange',
    'lemon',
    'lime',
    'grape',
    'berr',
    'avocado',
    'tomato',
    'potato',
    'onion',
    'garlic',
    'ginger',
    'carrot',
    'pepper',
    'lettuce',
    'spinach',
    'kale',
    'cucumber',
    'broccoli',
    'cauliflower',
    'mushroom',
    'herb',
    'basil',
    'coriander',
    'parsley',
    'pear',
    'plantain',
    'courgette',
    'zucchini',
    'celery',
    'salad',
    'fruit',
    'veg',
    'mango',
    'melon',
  ],
  bakery: [
    'bread',
    'loaf',
    'loaves',
    'bagel',
    'croissant',
    'bun',
    'roll',
    'tortilla',
    'pitta',
    'pita',
    'baguette',
    'sourdough',
    'cake',
  ],
  dairy: [
    'milk',
    'egg',
    'cheese',
    'butter',
    'yoghurt',
    'yogurt',
    'cream',
    'feta',
    'mozzarella',
    'parmesan',
    'halloumi',
    'oat milk',
  ],
  meat: [
    'chicken',
    'beef',
    'pork',
    'lamb',
    'mince',
    'bacon',
    'sausage',
    'ham',
    'fish',
    'salmon',
    'tuna',
    'prawn',
    'shrimp',
    'turkey',
    'steak',
  ],
  pantry: [
    'rice',
    'pasta',
    'spaghetti',
    'noodle',
    'flour',
    'sugar',
    'salt',
    'oil',
    'vinegar',
    'cereal',
    'oats',
    'beans',
    'lentil',
    'chickpea',
    'sauce',
    'stock',
    'spice',
    'honey',
    'jam',
    'peanut',
    'nuts',
    'peanut butter',
    'salt and pepper',
    'coffee',
    'tea',
    'tin',
    'can of',
    'soup',
    'crisps',
    'chocolate',
    'biscuit',
    'snack',
  ],
  frozen: ['frozen', 'ice cream', 'peas', 'ice'],
  drinks: [
    'juice',
    'orange juice',
    'apple juice',
    'water',
    'soda',
    'cola',
    'beer',
    'wine',
    'lemonade',
    'kombucha',
    'squash',
  ],
  household: [
    'toilet',
    'paper towel',
    'kitchen roll',
    'bin bag',
    'bin liner',
    'detergent',
    'washing up',
    'dish soap',
    'dishwasher',
    'bleach',
    'sponge',
    'foil',
    'cling',
    'batter',
    'bulb',
    'cleaner',
    'laundry',
    'tissues',
  ],
  personal: [
    'toothpaste',
    'toothbrush',
    'shampoo',
    'conditioner',
    'soap',
    'deodorant',
    'razor',
    'plaster',
    'paracetamol',
    'ibuprofen',
    'sunscreen',
    'floss',
  ],
};

const TODO_KEYWORDS: Record<Exclude<TodoCategory, 'general'>, readonly string[]> = {
  bills: [
    'pay',
    'rent',
    'bill',
    'invoice',
    'tax',
    'council',
    'electric',
    'gas bill',
    'water bill',
    'insurance',
    'subscription',
    'mortgage',
  ],
  errands: [
    'pick up',
    'collect',
    'drop off',
    'return',
    'post',
    'parcel',
    'pharmacy',
    'dry clean',
    'shop for',
  ],
  home: [
    'fix',
    'repair',
    'clean',
    'paint',
    'water the',
    'plants',
    'vacuum',
    'hoover',
    'mop',
    'tidy',
    'declutter',
    'assemble',
    'hang',
    'boiler',
    'filter',
  ],
  admin: [
    'call',
    'email',
    'book',
    'renew',
    'schedule',
    'cancel',
    'register',
    'apply',
    'form',
    'appointment',
    'dentist',
    'doctor',
    'vet',
  ],
};

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Longest keyword wins, matched at a word start: "kitchen roll" beats "roll",
 * "ice cream" beats "cream", and "juice" never matches "ice".
 */
function matchKeywords<C extends string>(
  title: string,
  table: Record<C, readonly string[]>,
): C | undefined {
  let best: { category: C; length: number } | undefined;
  for (const [category, words] of Object.entries(table) as [C, readonly string[]][]) {
    for (const word of words) {
      if (word.length <= (best?.length ?? 0)) continue;
      if (new RegExp(`\\b${escape(word)}`, 'i').test(title))
        best = { category, length: word.length };
    }
  }
  return best?.category;
}

/** Rule-based and offline. Anything labelled frozen goes in the freezer aisle. */
export function categorize(title: string, kind: ListKind): Category {
  if (kind === 'grocery') {
    if (/\bfrozen\b/i.test(title)) return 'frozen';
    return matchKeywords(title, GROCERY_KEYWORDS) ?? 'other';
  }
  return matchKeywords(title, TODO_KEYWORDS) ?? 'general';
}
