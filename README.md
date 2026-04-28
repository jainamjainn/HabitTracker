# HabitTracker

A personal habit tracking web app built with React Native (Expo) and Firebase. Track daily habits, manage tasks, run focus sessions, and view progress stats — all synced to the cloud with email/password login.

**Live App:** https://habit-tracker-77ac0.web.app

---

## Features

### Today
- Daily habit checklist with one-tap completion
- Streak counter and progress bar per habit
- Daily completion percentage in the header
- Personalised greeting with date

### Habits
- Preset library with 25+ habits across Popular / Health / Sports categories
- Create fully custom habits with emoji, colour, and motivation text
- Habit type: **Build** a habit or **Quit** a habit
- Time range: Anytime / Morning / Afternoon / Evening
- Streak goal (default 30 days)
- Optional daily reminders with day-of-week selection
- Edit and delete habits

### Tasks (To-Do)
- Add tasks with title, notes, and priority (Low / Medium / High)
- Due dates: Today, Tomorrow, or any custom date
- Mark complete, edit, delete
- Filter by All / Active / Done

### Focus
- Pomodoro timer: preset durations (15, 20, 25, 30, 45 min) or custom (1–180 min)
- Stopwatch mode
- Session counter tracks completed Pomodoros
- Accurate background timing — stays correct when app is minimised

### Stats
- Weekly habit completion bar chart
- Per-habit streak and monthly completion rate
- Overview cards: total habits, completions, best streak, days active

### Me (Profile)
- Edit display name
- View email and member since date
- Sign out (data stays in cloud, restored on next login)
- Reset all data (permanent delete)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (web export) |
| Language | TypeScript |
| Navigation | React Navigation v7 (Bottom Tabs) |
| Auth | Firebase Authentication (Email/Password) |
| Database | Firebase Firestore |
| Hosting | Firebase Hosting |
| Local cache | AsyncStorage (offline-first) |
| Icons | @expo/vector-icons (Ionicons) |

---

## Architecture

- **Local-first**: All reads/writes go to AsyncStorage — fast and works offline
- **Cloud backup**: Every save fires a background Firestore sync (no waiting)
- **Auth**: Firebase Auth manages sessions; Firestore stores data keyed by email
- **Cross-device restore**: Sign in on any device → data pulled from Firestore automatically

---

## Project Structure

```
HabitTracker/
├── App.tsx                         # Root: auth state machine + bottom tab navigator
├── firebase.json                   # Firebase Hosting config
├── .firebaserc                     # Firebase project alias
├── src/
│   ├── components/
│   │   └── AddHabitModal.tsx       # Habit create/edit modal
│   ├── screens/
│   │   ├── AuthScreen.tsx          # Login / Sign up (email + password)
│   │   ├── OnboardingScreen.tsx    # First-time name + habit selection
│   │   ├── TodayScreen.tsx         # Daily checklist
│   │   ├── HabitsScreen.tsx        # Habit management
│   │   ├── TodoScreen.tsx          # Task management
│   │   ├── FocusScreen.tsx         # Pomodoro + stopwatch
│   │   ├── StatsScreen.tsx         # Progress analytics
│   │   └── ProfileScreen.tsx       # Me tab
│   ├── utils/
│   │   ├── firebase.ts             # Firebase app, db, auth exports
│   │   ├── cloudStorage.ts         # Firestore read/write
│   │   ├── storage.ts              # AsyncStorage helpers
│   │   ├── notifications.ts        # Push notification scheduling
│   │   ├── habitUtils.ts           # Streak calculations
│   │   └── dateUtils.ts            # Date helpers
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces (Habit, Task, UserProfile)
│   └── theme.ts                    # Colors, spacing, preset habit library
└── assets/                         # App icon and splash screen
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Start dev server in browser
npx expo start --web

# Build for production
npx expo export --platform web

# Deploy to Firebase
firebase deploy
```

**Requirements:**
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project with Firestore + Authentication (Email/Password) enabled

---

## Firebase Setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database**
3. Enable **Authentication → Sign-in method → Email/Password**
4. Copy your config object into `src/utils/firebase.ts`
5. Run `firebase login` then `firebase deploy`

---

## Version

**v3.0** — April 2026 · Built with Expo + Firebase
