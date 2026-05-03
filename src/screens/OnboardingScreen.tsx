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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Habit } from '../types';
import { saveHabits, setOnboarded, saveUserProfile, getUserEmail } from '../utils/storage';
import { saveUserToCloud } from '../utils/cloudStorage';
import { COLORS, PRESET_HABITS, SPACING } from '../theme';

interface Props {
  onComplete: () => void;
}

type Step = 'name' | 'habits';

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  function toggleHabit(habitName: string) {
    setSelected(prev =>
      prev.includes(habitName) ? prev.filter(n => n !== habitName) : [...prev, habitName]
    );
  }

  async function handleNameContinue() {
    if (!name.trim()) {
      Alert.alert('Enter your name', 'Tell us what to call you!');
      return;
    }
    const email = await getUserEmail() ?? '';
    await saveUserProfile({ name: name.trim(), email, joinedAt: new Date().toISOString() });
    setStep('habits');
  }

  async function handleGetStarted() {
    if (selected.length === 0) {
      Alert.alert('Pick at least one habit', 'Select at least one habit to get started.');
      return;
    }
    const habits: Habit[] = selected.map((habitName, i) => {
      const preset = PRESET_HABITS.find(p => p.name === habitName)!;
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
        habitType: 'build' as const,
        timeRange: 'anytime' as const,
        createdAt: new Date().toISOString(),
      };
    });
    await saveHabits(habits);
    await setOnboarded();
    // Mark user as onboarded in cloud so sign-out + sign-in restores correctly
    const email = await getUserEmail();
    if (email) await saveUserToCloud(email, { onboarded: true });
    onComplete();
  }

  if (step === 'name') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.nameScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.nameEmoji}>👋</Text>
            <Text style={styles.nameTitle}>What's your name?</Text>
            <Text style={styles.nameSubtitle}>We'll use this to personalise your experience</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Alex"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="words"
              maxLength={30}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNameContinue}
            />
            <TouchableOpacity style={styles.startBtn} onPress={handleNameContinue} activeOpacity={0.85}>
              <Text style={styles.startBtnText}>Next →</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Step 2: habit selection
  const popularHabits = PRESET_HABITS.filter(p => p.category === 'Popular');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.title}>Choose your habits</Text>
        <Text style={styles.subtitle}>
          Hi {name}! Pick habits to start with. You can add more later.
        </Text>
      </View>

      <FlatList
        data={popularHabits}
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
        {selected.length > 0 && (
          <Text style={styles.selectedCount}>{selected.length} selected</Text>
        )}
        <TouchableOpacity style={styles.startBtn} onPress={handleGetStarted} activeOpacity={0.85}>
          <Text style={styles.startBtnText}>Get Started!</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Name step
  nameScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl },
  nameEmoji: { fontSize: 64, textAlign: 'center', marginBottom: SPACING.md },
  nameTitle: { fontSize: 30, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.sm },
  nameSubtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 22 },
  nameInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 16,
    paddingHorizontal: SPACING.lg, paddingVertical: 16,
    fontSize: 20, fontWeight: '700', color: COLORS.text,
    backgroundColor: '#FAFAFA', marginBottom: SPACING.lg, textAlign: 'center',
  },

  // Habit step
  header: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },
  grid: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  row: { gap: SPACING.md, marginBottom: SPACING.md },
  habitCard: {
    flex: 1, backgroundColor: '#FAFAFA', borderRadius: 18,
    paddingVertical: SPACING.lg, paddingHorizontal: SPACING.md,
    alignItems: 'center', borderWidth: 2, borderColor: '#F0F0F0',
    minHeight: 110, justifyContent: 'center',
  },
  habitCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  habitEmoji: { fontSize: 38, marginBottom: SPACING.sm },
  habitName: { fontSize: 14, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  footer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, paddingTop: SPACING.sm },
  selectedCount: {
    textAlign: 'center', fontSize: 13, fontWeight: '600',
    color: COLORS.primary, marginBottom: SPACING.sm,
  },
  startBtn: { backgroundColor: COLORS.text, borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  startBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
});
