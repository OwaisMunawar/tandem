import { act, fireEvent, screen } from '@testing-library/react-native';

import { renderWithHousehold } from '@/test-utils/renderWithHousehold';

import { HouseholdScreen } from '../HouseholdScreen';

jest.mock('@/features/reminders/data/expoNotifications', () => ({
  requestReminderPermission: jest.fn(async () => true),
}));

describe('HouseholdScreen', () => {
  it('lists members with presence and offers to connect a server', async () => {
    const { runtime } = await renderWithHousehold(<HouseholdScreen />);
    expect(screen.getByText('Ngozi Okafor')).toBeTruthy();
    expect(screen.getAllByText('This phone')).toHaveLength(2);
    expect(screen.getAllByText('Away').length).toBe(2);
    expect(screen.getByText('None, local only')).toBeTruthy();

    // Linnea opens the app on her phone and starts editing an item.
    await act(async () => {
      runtime.presence.setRow('devices', 'linnea-phone', {
        memberId: 'linnea',
        lastSeen: Date.now(),
        editing: 'g5',
      });
    });
    expect(await screen.findByText('Editing “Oat milk”')).toBeTruthy();
  });

  it('switches appearance and reminders as device-only settings', async () => {
    const { runtime } = await renderWithHousehold(<HouseholdScreen />);
    await fireEvent.press(screen.getByTestId('appearance-dark'));
    await fireEvent(screen.getByTestId('reminders'), 'valueChange', true);
    await screen.findByTestId('reminders');
    // Device settings never touch the shared household document.
    expect(Object.keys(runtime.store.getValues()).sort()).toEqual([
      'createdAt',
      'householdName',
      'timeZone',
    ]);
  });
});
