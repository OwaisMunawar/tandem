import { categoriesFor, categorize, defaultCategory, isCategory } from '../categories';

describe('categorize', () => {
  it.each([
    ['Oat milk', 'dairy'],
    ['Eggs', 'dairy'],
    ['Sourdough', 'bakery'],
    ['Plantain', 'produce'],
    ['Frozen peas', 'frozen'],
    ['Ice cream', 'frozen'],
    ['Orange juice', 'drinks'],
    ['Basmati rice', 'pantry'],
    ['Kitchen roll', 'household'],
    ['Peanut butter', 'pantry'],
    ['Salt and pepper', 'pantry'],
    ['Toothpaste', 'personal'],
    ['Lightbulb', 'other'],
  ])('%s goes in %s', (title, category) => {
    expect(categorize(title, 'grocery')).toBe(category);
  });

  it.each([
    ['Pay rent', 'bills'],
    ['Return library books', 'errands'],
    ['Fix the bathroom tap', 'home'],
    ['Book dentist appointment', 'admin'],
    ['Book boiler service', 'home'],
    ['Think about holidays', 'general'],
  ])('to-do %s goes in %s', (title, category) => {
    expect(categorize(title, 'todo')).toBe(category);
  });

  it('describes categories per list kind', () => {
    expect(categoriesFor('grocery')).toContain('dairy');
    expect(categoriesFor('todo')).not.toContain('dairy');
    expect(defaultCategory('grocery')).toBe('other');
    expect(defaultCategory('todo')).toBe('general');
    expect(isCategory('bills')).toBe(true);
    expect(isCategory('snacks')).toBe(false);
  });
});
