import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { renderWithHousehold } from '@/test-utils/renderWithHousehold';

import { ListsScreen } from '../ListsScreen';

describe('ListsScreen', () => {
  it('shows groceries grouped by aisle with done items last', async () => {
    await renderWithHousehold(<ListsScreen />);
    expect(screen.getByText('The Okafor-Lindqvist flat')).toBeTruthy();
    expect(screen.getByText('Fruit & veg')).toBeTruthy();
    expect(screen.getByText('Plantain')).toBeTruthy();
    expect(screen.getByText('12 to go · 2 done')).toBeTruthy();
    expect(screen.getByTestId('clear-done')).toBeTruthy();
    // A household without a server says so instead of pretending to sync.
    expect(screen.getByText('On this phone')).toBeTruthy();
  });

  it('ticks an item off and writes it to the household store', async () => {
    const { runtime } = await renderWithHousehold(<ListsScreen />);
    await fireEvent.press(screen.getByTestId('toggle-g1'));
    expect(runtime.store.getCell('items', 'g1', 'done')).toBe(true);
    expect(screen.getByText('11 to go · 3 done')).toBeTruthy();
  });

  it('deletes with undo', async () => {
    const { runtime } = await renderWithHousehold(<ListsScreen />);
    await fireEvent(screen.getByTestId('item-g2'), 'accessibilityAction', {
      nativeEvent: { actionName: 'delete' },
    });
    expect(runtime.store.hasRow('items', 'g2')).toBe(false);
    expect(screen.getByText('Deleted “Spinach”')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('toast-action'));
    expect(runtime.store.getCell('items', 'g2', 'title')).toBe('Spinach');
  });

  it('adds an item into the right category', async () => {
    const { runtime } = await renderWithHousehold(<ListsScreen />);
    const input = screen.getByTestId('add-item-input');
    await fireEvent.changeText(input, 'Greek yoghurt');
    await fireEvent(input, 'submitEditing');
    const added = Object.values(runtime.store.getTable('items')).find(
      (row) => row.title === 'Greek yoghurt',
    );
    expect(added).toMatchObject({ category: 'dairy', createdBy: 'ngozi', listId: 'groceries' });
  });

  it('switches to the to-do list and reflects remote edits live', async () => {
    const { runtime } = await renderWithHousehold(<ListsScreen />);
    await fireEvent.press(screen.getByTestId('list-picker-todos'));
    expect(screen.getByText('Pay rent')).toBeTruthy();
    // Another phone renames the item; the row updates without any refresh.
    await act(async () => {
      runtime.store.setCell('items', 't1', 'title', 'Pay October rent');
    });
    expect(screen.getByText('Pay October rent')).toBeTruthy();
    expect(within(screen.getByTestId('lists-screen')).getByText('Bills')).toBeTruthy();
  });
});
