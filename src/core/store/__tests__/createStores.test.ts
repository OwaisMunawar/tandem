import { createDeviceStore, createHouseholdStore, createPresenceStore } from '../createStores';

describe('stores', () => {
  it('applies schema defaults and drops unknown cells', () => {
    const store = createHouseholdStore();
    store.setRow('items', 'a', { title: 'Milk' });
    expect(store.getRow('items', 'a')).toMatchObject({
      title: 'Milk',
      done: false,
      category: 'other',
      position: 0,
    });
    // Values from a newer client with unknown fields are ignored rather than corrupting the schema.
    (
      store as unknown as { setCell: (t: string, r: string, c: string, v: unknown) => void }
    ).setCell('items', 'a', 'mystery', 1);
    expect(Object.keys(store.getRow('items', 'a'))).not.toContain('mystery');
  });

  it('creates presence and device stores', () => {
    expect(
      createPresenceStore().setRow('devices', 'd', { memberId: 'm' }).getRow('devices', 'd'),
    ).toMatchObject({ lastSeen: 0 });
    expect(createDeviceStore().getValues()).toMatchObject({
      colorScheme: 'system',
      quickAddLlm: true,
      syncPaused: false,
    });
  });
});
