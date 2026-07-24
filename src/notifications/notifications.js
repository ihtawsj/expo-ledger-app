import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { monthKey, todayISO } from '../logic/utils';

/** Local notifications need a dev/preview build — Expo Go throws on Android if the module loads. */
export const notificationsAvailable = !isRunningInExpoGo();

let notificationsModule = null;

async function getNotifications() {
  if (!notificationsAvailable) return null;
  if (!notificationsModule) {
    notificationsModule = await import('expo-notifications');
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  return notificationsModule;
}

export async function initNotifications() {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('budget', {
      name: 'Budget alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync('recurring', {
      name: 'Recurring reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

export async function sendBudgetAlert(title, body, enabled = true) {
  if (!enabled || !notificationsAvailable) return;
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
    ...(Platform.OS === 'android' ? { channelId: 'budget' } : {}),
  });
}

export function checkBudgetAlerts(settings, expenses, onThreshold) {
  const mk = monthKey(todayISO());
  const budget = settings.monthlyBudget;
  if (!budget) return settings;

  const spent = expenses.filter((e) => monthKey(e.date) === mk).reduce((s, e) => s + e.amount, 0);
  const pct = (spent / budget) * 100;
  const alertedThresholds = { ...(settings.alertedThresholds || {}) };
  alertedThresholds[mk] = alertedThresholds[mk] || [];
  const already = alertedThresholds[mk];

  const thresholds = [
    [100, 'Budget exceeded! 🚨', "You've gone over your monthly budget."],
    [90, '90% of budget used', "You've used 90% of your monthly budget."],
    [75, '75% of budget used', "You've used 75% of your monthly budget."],
    [50, '50% of budget used', "You've used half your monthly budget."],
  ];

  for (const [th, title, body] of thresholds) {
    if (pct >= th && !already.includes(th)) {
      onThreshold?.({ th, title, body });
      already.push(th);
      break;
    }
  }

  return { ...settings, alertedThresholds };
}

async function cancelRecurringScheduled(Notifications) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier?.startsWith('recurring-'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function scheduleRecurringReminders(recurringList, enabled = true) {
  if (!notificationsAvailable) return;
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await cancelRecurringScheduled(Notifications);
  if (!enabled) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const now = new Date();
  for (const rec of recurringList) {
    const day = Math.min(Math.max(rec.day || 1, 1), 28);
    let triggerDate = new Date(now.getFullYear(), now.getMonth(), day, 9, 0, 0);
    if (triggerDate <= now) {
      triggerDate = new Date(now.getFullYear(), now.getMonth() + 1, day, 9, 0, 0);
    }
    await Notifications.scheduleNotificationAsync({
      identifier: `recurring-${rec.id}`,
      content: {
        title: `${rec.name} due soon`,
        body: `${rec.name} (${rec.category}) — remember to log it.`,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      ...(Platform.OS === 'android' ? { channelId: 'recurring' } : {}),
    });
  }
}

export async function scheduleWeeklySummary(totalSpent, currency) {
  if (!notificationsAvailable) return;
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7 || 7));
  nextSunday.setHours(10, 0, 0, 0);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Weekly spending summary',
      body: `You spent ${currency}${totalSpent.toLocaleString('en-IN')} this week.`,
      sound: false,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextSunday },
    ...(Platform.OS === 'android' ? { channelId: 'budget' } : {}),
  });
}
