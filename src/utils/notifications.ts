import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Device.isDevice) {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  }
}

// Returns array of notification IDs (one per scheduled day)
export async function scheduleHabitReminder(
  habitName: string,
  time: string,
  reminderDays: number[] = [] // 0=Sun..6=Sat, empty = every day
): Promise<string[]> {
  const parts = time.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return [];

  const ids: string[] = [];

  if (reminderDays.length === 0) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Habit Reminder',
          body: `Time to complete: ${habitName}`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });
      ids.push(id);
    } catch {}
  } else {
    for (const day of reminderDays) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Habit Reminder',
            body: `Time to complete: ${habitName}`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: day + 1, // expo: 1=Sun..7=Sat
            hour: hours,
            minute: minutes,
          },
        });
        ids.push(id);
      } catch {}
    }
  }

  return ids;
}

export async function cancelHabitReminders(notificationIds: string[]): Promise<void> {
  for (const id of notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
}
