import { diffReminders, type Reminder } from '../lib/reminderPlan';

/** The notification system, as far as reminders care. */
export type NotificationPort = {
  scheduledIds(): Promise<string[]>;
  schedule(reminder: Reminder): Promise<void>;
  cancel(id: string): Promise<void>;
};

export async function syncReminders(port: NotificationPort, desired: readonly Reminder[]) {
  const plan = diffReminders(await port.scheduledIds(), desired);
  await Promise.all(plan.cancel.map((id) => port.cancel(id)));
  await Promise.all(plan.schedule.map((reminder) => port.schedule(reminder)));
  return { cancelled: plan.cancel.length, scheduled: plan.schedule.length };
}

export async function clearReminders(port: NotificationPort) {
  await syncReminders(port, []);
}
