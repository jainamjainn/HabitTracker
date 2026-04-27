# HabitTracker

A personal habit tracker and productivity app built with Expo (React Native). Inspired by TickTick — all premium features included.

## Features

### Today
- Personalized greeting using your name
- Rectangular habit cards with color-fill progress showing streak vs. goal
- Mark habits complete with a tap
- Daily completion percentage in the header

### Habits
- Add, edit, and delete habits
- Custom emoji, color, and motivation text per habit
- Set reminder days (specific days of the week)
- Streak goal presets (7, 14, 21, 30, 60, 100 days) or custom input
- Daily/weekly push notification reminders

### Tasks
- Full task management with title, notes, priority, and due dates
- Priority levels: High, Medium, Low
- Eisenhower Matrix view — 4-quadrant grid (Do First / Schedule / Delegate / Eliminate)
- Quick due date chips (Today, Tomorrow, In 3 Days, Next Week)
- Toggle between list view and matrix view

### Focus
- Pomodoro timer with duration options: 15, 20, 25, 30, 45 minutes
- Stopwatch mode
- Accurate background timing (keeps counting when app is minimized)
- Session counter with dot indicators
- Vibration alert on Pomodoro completion

### Me (Profile)
- Set your display name
- Stats overview: total habits, completions, best streak, days active
- Weekly bar chart of completions
- Per-habit progress bars with monthly completion rate
- Reset all app data

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo (React Native) |
| Language | TypeScript |
| Navigation | React Navigation (Bottom Tabs) |
| Storage | AsyncStorage |
| Notifications | expo-notifications |
| Icons | @expo/vector-icons (Ionicons) |

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later)
- [Expo Go](https://expo.dev/go) app on your iPhone or Android device

### Run locally

```bash
# Install dependencies
npm install

# Start the dev server
npx expo start --port 8082
```

Scan the QR code in Expo Go to open the app on your phone.

## Project Structure

```
HabitTracker/
├── App.tsx                   # Root navigator (5 tabs)
├── src/
│   ├── types/index.ts        # TypeScript types (Habit, Task, UserProfile)
│   ├── theme.ts              # Colors, spacing, priority colors
│   ├── components/
│   │   └── AddHabitModal.tsx # Habit creation/edit form
│   ├── screens/
│   │   ├── OnboardingScreen.tsx
│   │   ├── TodayScreen.tsx
│   │   ├── HabitsScreen.tsx
│   │   ├── TodoScreen.tsx
│   │   ├── FocusScreen.tsx
│   │   └── ProfileScreen.tsx
│   └── utils/
│       ├── storage.ts        # AsyncStorage helpers
│       ├── habitUtils.ts     # Streak calculations
│       ├── notifications.ts  # Push notification scheduling
│       └── dateUtils.ts      # Date formatting helpers
└── assets/                   # App icons and splash screen
```

## Version

**v2.0** — April 2026
