import { HabitLog } from '../types';
import { getTodayKey } from './dateUtils';

// Streak counts consecutive scheduled days completed, skipping non-scheduled days.
// If today is scheduled but not yet checked, it doesn't break the streak.
export function getCurrentStreak(
  habitId: string,
  logs: HabitLog,
  reminderDays: number[] = []
): number {
  const isScheduled = (d: Date) =>
    reminderDays.length === 0 || reminderDays.includes(d.getDay());

  let streak = 0;
  const base = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);

    if (!isScheduled(d)) continue;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Today not yet done — skip without breaking streak
    if (i === 0 && !logs[key]?.includes(habitId)) continue;

    if (logs[key]?.includes(habitId)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function getLongestStreak(habitId: string, logs: HabitLog): number {
  const allDates = Object.keys(logs).sort();
  let longest = 0;
  let current = 0;
  let prevDate: Date | null = null;

  for (const dateStr of allDates) {
    if (!logs[dateStr]?.includes(habitId)) {
      current = 0;
      prevDate = null;
      continue;
    }
    const date = new Date(dateStr + 'T00:00:00');
    if (prevDate) {
      const diff = (date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      current = diff === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }
    if (current > longest) longest = current;
    prevDate = date;
  }
  return longest;
}

export function getMonthlyRate(
  habitId: string,
  logs: HabitLog,
  reminderDays: number[] = []
): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDate = today.getDate();

  let scheduled = 0;
  let completed = 0;

  for (let day = 1; day <= todayDate; day++) {
    const d = new Date(year, month, day);
    const dow = d.getDay();
    if (reminderDays.length > 0 && !reminderDays.includes(dow)) continue;
    scheduled++;
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (logs[key]?.includes(habitId)) completed++;
  }

  return scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);
}

export function getWeeklyRate(habitId: string, logs: HabitLog): number {
  const today = new Date();
  let completed = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (logs[key]?.includes(habitId)) completed++;
  }
  return Math.round((completed / 7) * 100);
}

export function getTodayCompletionRate(habitIds: string[], logs: HabitLog): number {
  if (habitIds.length === 0) return 0;
  const today = getTodayKey();
  const completed = (logs[today] || []).filter(id => habitIds.includes(id)).length;
  return Math.round((completed / habitIds.length) * 100);
}
