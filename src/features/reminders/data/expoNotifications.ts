import * as Notifications from 'expo-notifications';

import { type NotificationPort } from './reminderScheduler';

const PREFIX = 'tandem:';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

/** Only touches notifications Tandem created, identified by prefix. */
export const expoNotificationPort: NotificationPort = {
  async scheduledIds() {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all
      .map((request) => request.identifier)
      .filter((id) => id.startsWith(PREFIX))
      .map((id) => id.slice(PREFIX.length));
  },
  async schedule(reminder) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${reminder.id}`,
      content: { title: reminder.title, body: reminder.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(reminder.at),
      },
    });
  },
  async cancel(id) {
    await Notifications.cancelScheduledNotificationAsync(`${PREFIX}${id}`);
  },
};
