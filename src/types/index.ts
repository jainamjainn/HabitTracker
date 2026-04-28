export type HabitType = 'build' | 'quit';
export type TimeRange = 'anytime' | 'morning' | 'afternoon' | 'evening';

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  motivationText: string | null;
  reminderTime: string | null;
  reminderDays: number[]; // 0=Sun..6=Sat, empty = every day
  notificationIds: string[];
  streakGoal: number; // target streak in days, default 30
  habitType: HabitType;
  timeRange: TimeRange;
  createdAt: string;
}

export type HabitLog = {
  [date: string]: string[];
};

export type TaskPriority = 'high' | 'medium' | 'low' | 'none';

export interface Task {
  id: string;
  title: string;
  notes: string;
  priority: TaskPriority;
  urgent: boolean;
  important: boolean;
  dueDate: string | null; // YYYY-MM-DD
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  joinedAt: string;
}
