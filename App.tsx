import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { onAuthStateChanged } from 'firebase/auth';

import TodayScreen from './src/screens/TodayScreen';
import HabitsScreen from './src/screens/HabitsScreen';
import TodoScreen from './src/screens/TodoScreen';
import FocusScreen from './src/screens/FocusScreen';
import StatsScreen from './src/screens/StatsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AuthScreen from './src/screens/AuthScreen';
import { setupNotifications } from './src/utils/notifications';
import { isOnboarded, setUserEmail, setOnboarded, saveHabits, saveLogs, saveTasks, saveUserProfile } from './src/utils/storage';
import { fetchUserByEmail } from './src/utils/cloudStorage';
import { auth } from './src/utils/firebase';
import { COLORS } from './src/theme';

const Tab = createBottomTabNavigator();
type AppState = 'loading' | 'auth' | 'onboarding' | 'app';

const TAB_EMOJIS: Record<string, string> = {
  Today: '🏠',
  Habits: '💪',
  Tasks: '✅',
  Focus: '🎯',
  Stats: '📊',
  Me: '👤',
};

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function init() {
      await Font.loadAsync(Ionicons.font);
      setupNotifications();

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser || !firebaseUser.email) {
          setAppState('auth');
          return;
        }

        const email = firebaseUser.email;
        await setUserEmail(email);

        const onboarded = await isOnboarded();
        if (onboarded) {
          setAppState('app');
          return;
        }

        // First time on this device — pull from cloud
        const existing = await fetchUserByEmail(email);
        if (existing) {
          if (existing.habits) await saveHabits(existing.habits);
          if (existing.logs) await saveLogs(existing.logs);
          if (existing.tasks) await saveTasks(existing.tasks);
          if (existing.profile) await saveUserProfile(existing.profile);
          await setOnboarded();
          setAppState('app');
        } else {
          setAppState('onboarding');
        }
      });
    }

    init();
    return () => unsubscribe?.();
  }, []);

  if (appState === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (appState === 'auth') {
    return <AuthScreen />;
  }

  if (appState === 'onboarding') {
    return <OnboardingScreen onComplete={() => setAppState('app')} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: '#BBBBBB',
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: '#F0F0F0',
            elevation: 0,
            shadowOpacity: 0,
            height: Platform.OS === 'web' ? 80 : 64,
            paddingBottom: Platform.OS === 'web' ? 20 : 10,
            paddingTop: 6,
            backgroundColor: '#fff',
          },
          tabBarIcon: ({ focused }) => {
            const emoji = TAB_EMOJIS[route.name] ?? '•';
            return (
              <Text style={{ fontSize: focused ? 24 : 20, lineHeight: 28 }}>{emoji}</Text>
            );
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        })}
      >
        <Tab.Screen name="Today" component={TodayScreen} />
        <Tab.Screen name="Habits" component={HabitsScreen} />
        <Tab.Screen name="Tasks" component={TodoScreen} />
        <Tab.Screen name="Focus" component={FocusScreen} />
        <Tab.Screen name="Stats" component={StatsScreen} />
        <Tab.Screen
          name="Me"
          children={() => <ProfileScreen onReset={() => setAppState('auth')} />}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
