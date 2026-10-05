import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithHousehold } from '@/test-utils/renderWithHousehold';

import { QuickAddScreen } from '../QuickAddScreen';

describe('QuickAddScreen', () => {
  it('previews drafts, lets you drop one, and adds the rest on confirm', async () => {
    const { runtime } = await renderWithHousehold(<QuickAddScreen />);
    await fireEvent.changeText(
      screen.getByTestId('quick-add-input'),
      'milk, eggs and pay rent Friday, Sam does dishes daily',
    );
    await fireEvent.press(screen.getByTestId('quick-add-preview'));

    expect(await screen.findByText('4 to add')).toBeTruthy();
    expect(screen.getByText('Parsed on this phone')).toBeTruthy();
    expect(screen.getByText('Milk')).toBeTruthy();
    expect(screen.getByText(/Every day · .* · Sam/)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Remove Eggs'));
    expect(screen.getByText('3 to add')).toBeTruthy();

    const itemsBefore = runtime.store.getRowCount('items');
    const choresBefore = runtime.store.getRowCount('chores');
    await fireEvent.press(screen.getByTestId('quick-add-confirm'));
    expect(runtime.store.getRowCount('items')).toBe(itemsBefore + 2);
    expect(runtime.store.getRowCount('chores')).toBe(choresBefore + 1);
  });
});
