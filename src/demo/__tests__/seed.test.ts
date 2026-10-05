import { createDevice } from '@/test-utils/devices';

import { DEMO_HOUSEHOLD, seedDemoHousehold } from '../seed';

describe('demo seed', () => {
  it('seeds the fictional household relative to today', () => {
    const phone = createDevice('demo');
    const { founderId } = seedDemoHousehold(phone.store, {
      today: '2026-10-05',
      timeZone: 'Europe/London',
      now: Date.parse('2026-10-05T09:00:00Z'),
    });
    expect(founderId).toBe('ngozi');
    expect(phone.store.getValue('householdName')).toBe(DEMO_HOUSEHOLD);
    expect(phone.household.activeMembers()).toHaveLength(3);
    const total = phone.store.getRowCount('items') + phone.store.getRowCount('chores');
    expect(total).toBeGreaterThanOrEqual(25);
    const chores = phone.chores.chores();
    expect(chores[0]).toMatchObject({ title: 'Take out the bins', dueDate: '2026-10-04' });
    expect(chores.some((chore) => chore.rotation.length > 1)).toBe(true);
  });
});
