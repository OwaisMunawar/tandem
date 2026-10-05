import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithHousehold } from '@/test-utils/renderWithHousehold';

import { ChoresScreen } from '../ChoresScreen';

describe('ChoresScreen', () => {
  it('groups chores into overdue, today and coming up', async () => {
    await renderWithHousehold(<ChoresScreen />);
    expect(screen.getByText('Overdue')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Coming up')).toBeTruthy();
    expect(screen.getByText('Take out the bins')).toBeTruthy();
    expect(screen.getByText('Mon, Thu')).toBeTruthy();
  });

  it('completing a rotating chore hands it to the next person', async () => {
    const { runtime } = await renderWithHousehold(<ChoresScreen />);
    expect(screen.getAllByText('then Linnea').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByTestId('complete-c1'));
    expect(runtime.store.getCell('chores', 'c1', 'assigneeId')).toBe('linnea');
    expect(runtime.store.getCell('chores', 'c1', 'lastDoneBy')).toBe('ngozi');
    expect(screen.getByText('Dishes done · Linnea is next')).toBeTruthy();
    expect(screen.getByText('Done today by Ngozi')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('toast-action'));
    expect(runtime.store.getCell('chores', 'c1', 'assigneeId')).toBe('sam');
  });
});
