import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, Platform, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';

import TodayScreen from './src/screens/TodayScreen';
import HabitsScreen from './src/screens/HabitsScreen';
import TodoScreen from './src/screens/TodoScreen';
import StatsScreen from './src/screens/StatsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AuthScreen from './src/screens/AuthScreen';
import AIScreen from './src/screens/AIScreen';
import { setupNotifications } from './src/utils/notifications';
import { isOnboarded, setUserEmail, setOnboarded, saveHabits, saveLogs, saveTasks, saveUserProfile, getHabits } from './src/utils/storage';
import { fetchUserByEmail } from './src/utils/cloudStorage';
import { auth } from './src/utils/firebase';
import { COLORS } from './src/theme';

const Tab = createBottomTabNavigator();
type AppState = 'loading' | 'auth' | 'onboarding' | 'app';

const TAB_EMOJIS: Record<string, string> = {
  Today: '🏠',
  Habits: '💪',
  Tasks: '✅',
  Stats: '📊',
  Me: '👤',
};

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [aiVisible, setAiVisible] = useState(false);

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

        const existing = await fetchUserByEmail(email);
        if (existing) {
          if (existing.habits) await saveHabits(existing.habits);
          if (existing.logs) await saveLogs(existing.logs);
          if (existing.tasks) await saveTasks(existing.tasks);
          if (existing.profile) await saveUserProfile(existing.profile);
          await setOnboarded();
          setAppState('app');
        } else {
          const localHabits = await getHabits();
          if (localHabits.length > 0) {
            await setOnboarded();
            setAppState('app');
          } else {
            setAppState('onboarding');
          }
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
      <View style={{ flex: 1 }}>
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
          <Tab.Screen name="Stats" component={StatsScreen} />
          <Tab.Screen
            name="Me"
            children={() => (
              <ProfileScreen
                onReset={() => setAppState('auth')}
                onOpenAI={() => setAiVisible(true)}
              />
            )}
          />
        </Tab.Navigator>

        {/* Floating AI button */}
        <TouchableOpacity
          style={styles.fabBtn}
          onPress={() => setAiVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.fabEmoji}>🤖</Text>
        </TouchableOpacity>

        {/* AI Modal */}
        <Modal
          visible={aiVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setAiVisible(false)}
        >
          <AIScreen onClose={() => setAiVisible(false)} />
        </Modal>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  fabBtn: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'web' ? 96 : 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabEmoji: { fontSize: 26, lineHeight: 30 },
});
