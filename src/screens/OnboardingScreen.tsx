import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  StatusBar,
} from 'react-native';
import { Habit } from '../types';
import { saveHabits, setOnboarded } from '../utils/storage';
import { COLORS, PRESET_HABITS, SPACING } from '../theme';

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggleHabit(name: string) {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  }

  async function handleGetStarted() {
    if (selected.length === 0) {
      Alert.alert('Pick at least one habit', 'Select at least one habit to get started.');
      return;
    }
    const habits: Habit[] = selected.map((name, i) => {
      const preset = PRESET_HABITS.find(p => p.name === name)!;
      return {
        id: `${Date.now()}_${i}`,
        name: preset.name,
        emoji: preset.emoji,
        color: COLORS.primary,
        motivationText: null,
        reminderTime: null,
        reminderDays: [],
        notificationIds: [],
        streakGoal: 30,
        createdAt: new Date().toISOString(),
      };
    });
    await saveHabits(habits);
    await setOnboarded();
    onComplete();
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.title}>Choose habit</Text>
        <Text style={styles.subtitle}>
          Choose your daily habits, you can choose more than one
        </Text>
      </View>

      <FlatList
        data={PRESET_HABITS}
        numColumns={2}
        keyExtractor={item => item.name}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.name);
          return (
            <TouchableOpacity
              style={[styles.habitCard, isSelected && styles.habitCardSelected]}
              onPress={() => toggleHabit(item.name)}
              activeOpacity={0.75}
            >
              <Text style={styles.habitEmoji}>{item.emoji}</Text>
              <Text style={styles.habitName}>{item.name}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startBtn} onPress={handleGetStarted} activeOpacity={0.85}>
          <Text style={styles.startBtnText}>Get Started!</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  grid: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  row: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  habitCard: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 18,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    minHeight: 110,
    justifyContent: 'center',
  },
  habitCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  habitEmoji: {
    fontSize: 38,
    marginBottom: SPACING.sm,
  },
  habitName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  startBtn: {
    backgroundColor: COLORS.text,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
