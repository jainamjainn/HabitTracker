import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, HabitLog, Task, UserProfile } from '../types';

const HABITS_KEY = 'habits_v1';
const LOGS_KEY = 'logs_v1';
const ONBOARDED_KEY = 'onboarded_v1';
const TASKS_KEY = 'tasks_v1';
const PROFILE_KEY = 'profile_v1';

export async function getHabits(): Promise<Habit[]> {
  try {
    const data = await AsyncStorage.getItem(HABITS_KEY);
    if (!data) return [];
    const habits = JSON.parse(data);
    return habits.map((h: any) => ({
      ...h,
      motivationText: h.motivationText ?? null,
      reminderDays: h.reminderDays ?? [],
      notificationIds: h.notificationIds ?? (h.notificationId ? [h.notificationId] : []),
      streakGoal: h.streakGoal ?? 30,
    }));
  } catch {
    return [];
  }
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

export async function getLogs(): Promise<HabitLog> {
  try {
    const data = await AsyncStorage.getItem(LOGS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export async function saveLogs(logs: HabitLog): Promise<void> {
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export async function toggleHabitCompletion(habitId: string, date: string): Promise<string[]> {
  const logs = await getLogs();
  const dayLog = [...(logs[date] || [])];
  const idx = dayLog.indexOf(habitId);
  if (idx >= 0) {
    dayLog.splice(idx, 1);
  } else {
    dayLog.push(habitId);
  }
  logs[date] = dayLog;
  await saveLogs(logs);
  return dayLog;
}

export async function isOnboarded(): Promise<boolean> {
  const val = await AsyncStorage.getItem(ONBOARDED_KEY);
  return val === 'true';
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
}

export async function getTasks(): Promise<Task[]> {
  try {
    const data = await AsyncStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const data = await AsyncStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function resetAllData(): Promise<void> {
  await AsyncStorage.multiRemove([HABITS_KEY, LOGS_KEY, ONBOARDED_KEY, TASKS_KEY]);
}
