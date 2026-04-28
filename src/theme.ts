export const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FFF0E6',
  background: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#888888',
  textLight: '#BBBBBB',
  border: '#F0F0F0',
  success: '#4CAF50',
  danger: '#EF4444',
};

export const PASTEL_COLORS = [
  '#E8F5E9',
  '#FDE8E8',
  '#FFF9E6',
  '#F0EEFF',
  '#E0F2FE',
  '#FCE4EC',
  '#E0F5F0',
  '#FFF0E6',
];

export const HABIT_COLORS = [
  '#FF6B35',
  '#8B5CF6',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#14B8A6',
];

export const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#3B82F6',
  none: '#D1D5DB',
};

export type PresetCategory = 'Popular' | 'Health' | 'Sports';

export const PRESET_HABITS: { name: string; emoji: string; category: PresetCategory }[] = [
  // Popular
  { name: 'Drink Water', emoji: '💧', category: 'Popular' },
  { name: 'Sleep Early', emoji: '😴', category: 'Popular' },
  { name: 'Meditation', emoji: '🧘', category: 'Popular' },
  { name: 'Read Books', emoji: '📚', category: 'Popular' },
  { name: 'Walk', emoji: '🚶', category: 'Popular' },
  { name: 'Journaling', emoji: '✍️', category: 'Popular' },
  { name: 'No Phone in Bed', emoji: '📵', category: 'Popular' },
  { name: 'Music', emoji: '🎵', category: 'Popular' },
  { name: 'Art & Design', emoji: '🎨', category: 'Popular' },
  // Health
  { name: 'Eat Healthy', emoji: '🥗', category: 'Health' },
  { name: 'Take Vitamins', emoji: '💊', category: 'Health' },
  { name: 'Skincare', emoji: '🧴', category: 'Health' },
  { name: 'Brush Teeth', emoji: '🦷', category: 'Health' },
  { name: 'No Junk Food', emoji: '🚫', category: 'Health' },
  { name: 'Intermittent Fasting', emoji: '⏱️', category: 'Health' },
  { name: 'Cold Shower', emoji: '🚿', category: 'Health' },
  { name: 'Stretch', emoji: '🤸', category: 'Health' },
  // Sports
  { name: 'Work Out', emoji: '🏋️', category: 'Sports' },
  { name: 'Running', emoji: '🏃', category: 'Sports' },
  { name: 'Cycling', emoji: '🚴', category: 'Sports' },
  { name: 'Swimming', emoji: '🏊', category: 'Sports' },
  { name: 'Yoga', emoji: '🧘', category: 'Sports' },
  { name: 'HIIT', emoji: '🔥', category: 'Sports' },
  { name: 'Football', emoji: '⚽', category: 'Sports' },
  { name: 'Basketball', emoji: '🏀', category: 'Sports' },
];

export const HABIT_EMOJIS = [
  '💪', '🏃', '📚', '💧', '🧘', '😴', '🥗', '🏋️',
  '✍️', '🎯', '🧹', '💊', '🎵', '🎨', '🌿', '🚴',
  '🧠', '☀️', '🦷', '🏊', '🥤', '🍎', '🏅', '❤️',
];

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
