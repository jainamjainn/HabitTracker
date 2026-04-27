import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import TodayScreen from './src/screens/TodayScreen';
import HabitsScreen from './src/screens/HabitsScreen';
import TodoScreen from './src/screens/TodoScreen';
import FocusScreen from './src/screens/FocusScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { setupNotifications } from './src/utils/notifications';
import { isOnboarded } from './src/utils/storage';
import { COLORS } from './src/theme';

const Tab = createBottomTabNavigator();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, [IconName, IconName]> = {
  Today: ['home', 'home-outline'],
  Habits: ['clipboard', 'clipboard-outline'],
  Tasks: ['checkmark-circle', 'checkmark-circle-outline'],
  Focus: ['timer', 'timer-outline'],
  Me: ['person', 'person-outline'],
};

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    setupNotifications();
    isOnboarded().then(val => setOnboarded(val));
  }, []);

  if (onboarded === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!onboarded) {
    return <OnboardingScreen onComplete={() => setOnboarded(true)} />;
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
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: 64,
            paddingBottom: 10,
            paddingTop: 8,
            backgroundColor: '#fff',
          },
          tabBarIcon: ({ focused, color, size }) => {
            const [active, inactive] = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
            return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        })}
      >
        <Tab.Screen name="Today" component={TodayScreen} />
        <Tab.Screen name="Habits" component={HabitsScreen} />
        <Tab.Screen name="Tasks" component={TodoScreen} />
        <Tab.Screen name="Focus" component={FocusScreen} />
        <Tab.Screen
          name="Me"
          children={() => <ProfileScreen onReset={() => setOnboarded(false)} />}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
