import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Habit, HabitLog, UserProfile } from '../types';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase';
import {
  getHabits,
  getLogs,
  getUserProfile,
  saveUserProfile,
  resetAllData,
  clearAuthSession,
} from '../utils/storage';
import { getCurrentStreak, getLongestStreak, getMonthlyRate } from '../utils/habitUtils';
import { getTodayKey, getLastNDays, getGreeting } from '../utils/dateUtils';
import { COLORS, PASTEL_COLORS, SPACING } from '../theme';

interface Props {
  onReset: () => void;
}

export default function ProfileScreen({ onReset }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog>({});
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [h, l, p] = await Promise.all([getHabits(), getLogs(), getUserProfile()]);
        setHabits(h);
        setLogs(l);
        setProfile(p);
        setNameInput(p?.name ?? '');
      }
      load();
    }, [])
  );

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const updated: UserProfile = {
      name: trimmed,
      email: profile?.email ?? '',
      joinedAt: profile?.joinedAt ?? new Date().toISOString(),
    };
    await saveUserProfile(updated);
    setProfile(updated);
    setEditingName(false);
  }

  function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Your data is saved to the cloud. Sign back in anytime to restore it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              await signOut(auth);
              await clearAuthSession();
            } catch {}
            onReset();
          },
        },
      ]
    );
  }

  function handleReset() {
    Alert.alert(
      'Reset Everything',
      'This will permanently delete all your habits, tasks, logs, and progress. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              await resetAllData();
            } catch {}
            onReset();
          },
        },
      ]
    );
  }

  const today = getTodayKey();
  const last7 = getLastNDays(7);

  // Computed stats
  const totalCompletions = Object.values(logs).reduce((sum, ids) => sum + ids.length, 0);
  const daysActive = Object.keys(logs).filter(d => (logs[d]?.length ?? 0) > 0).length;
  const bestStreak = habits.length
    ? Math.max(0, ...habits.map(h => getLongestStreak(h.id, logs)))
    : 0;
  const weekTotal = last7.reduce((acc, d) => acc + (logs[d]?.length ?? 0), 0);

  const displayName = profile?.name ?? '';
  const initials = displayName
    ? displayName
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>

          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your name"
                placeholderTextColor={COLORS.textLight}
                autoFocus
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <TouchableOpacity style={styles.saveNameBtn} onPress={handleSaveName}>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelNameBtn}
                onPress={() => { setEditingName(false); setNameInput(profile?.name ?? ''); }}
              >
                <Ionicons name="close" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)} style={styles.nameRow}>
              <Text style={styles.displayName}>
                {displayName || 'Tap to set your name'}
              </Text>
              <Ionicons name="pencil-outline" size={15} color={COLORS.textSecondary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}

          {profile?.email ? (
            <Text style={styles.emailText}>{profile.email}</Text>
          ) : null}
          {profile?.joinedAt && (
            <Text style={styles.joinedDate}>
              Member since{' '}
              {new Date(profile.joinedAt).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          )}
        </View>

        {/* Greeting banner */}
        {displayName ? (
          <View style={styles.greetingBanner}>
            <Text style={styles.greetingText}>
              {getGreeting()}, {displayName}! 💪 Keep crushing it.
            </Text>
          </View>
        ) : null}

        {/* Stats overview */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{habits.length}</Text>
            <Text style={styles.statLabel}>Habits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{totalCompletions}</Text>
            <Text style={styles.statLabel}>Completions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{bestStreak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{daysActive}</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </View>
        </View>

        {/* Weekly bar chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>This Week</Text>
            <Text style={styles.weekTotal}>{weekTotal} check-ins</Text>
          </View>
          <View style={styles.chart}>
            {last7.map(date => {
              const count = logs[date]?.length || 0;
              const pct = habits.length > 0 ? count / habits.length : 0;
              const isToday = date === today;
              const d = new Date(date + 'T00:00:00');
              const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
              return (
                <View key={date} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(pct * 100, 4)}%`,
                          backgroundColor: isToday ? COLORS.primary : '#E5E7EB',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, isToday && styles.barLabelActive]}>
                    {dayLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Habit streaks */}
        {habits.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Habit Progress</Text>
            {habits.map((habit, index) => {
              const streak = getCurrentStreak(habit.id, logs, habit.reminderDays);
              const goal = habit.streakGoal ?? 30;
              const progress = Math.min(streak / goal, 1);
              const monthly = getMonthlyRate(habit.id, logs, habit.reminderDays);
              const color = habit.color || COLORS.primary;
              const doneToday = (logs[today] || []).includes(habit.id);

              return (
                <View key={habit.id} style={styles.habitRow}>
                  <View
                    style={[
                      styles.habitIcon,
                      { backgroundColor: PASTEL_COLORS[index % PASTEL_COLORS.length] },
                    ]}
                  >
                    <Text style={styles.habitEmoji}>{habit.emoji}</Text>
                  </View>
                  <View style={styles.habitInfo}>
                    <View style={styles.habitNameRow}>
                      <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
                      <View style={styles.habitBadgeRow}>
                        <Text style={[styles.doneBadge, { color: doneToday ? COLORS.success : COLORS.textLight }]}>
                          {doneToday ? '✓' : '○'}
                        </Text>
                        <Text style={styles.streakNum}>🔥 {streak}</Text>
                      </View>
                    </View>
                    <View style={styles.progressRow}>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${progress * 100}%`, backgroundColor: color },
                          ]}
                        />
                      </View>
                      <Text style={styles.goalLabel}>{streak}/{goal}d</Text>
                    </View>
                    <Text style={styles.monthlyRate}>{monthly}% this month</Text>
                  </View>
                </View>
              );
            })}
          </>
        ) : null}

        {/* Settings */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setEditingName(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="person-outline" size={18} color="#0EA5E9" />
            </View>
            <Text style={styles.settingText}>Edit Name</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="log-out-outline" size={18} color="#D97706" />
            </View>
            <Text style={[styles.settingText, { color: '#D97706' }]}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </View>
            <Text style={[styles.settingText, { color: COLORS.danger }]}>Reset All Data</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>HabitTracker v2.0 · Made with ❤️</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 48 },

  profileCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  initials: { fontSize: 34, fontWeight: '800', color: '#fff' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  displayName: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 6 },
  nameInput: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: SPACING.md, paddingVertical: 9,
    fontSize: 18, fontWeight: '700', color: COLORS.text, minWidth: 160,
  },
  saveNameBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelNameBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  emailText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 2 },
  joinedDate: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },

  greetingBanner: {
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: SPACING.md,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  greetingText: {
    fontSize: 15, fontWeight: '700', color: COLORS.primary, textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 20, fontWeight: '800', color: COLORS.text,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md, marginBottom: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: SPACING.md, gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: '#fff', borderRadius: 18,
    padding: SPACING.md, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  statValue: { fontSize: 30, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 3 },

  chartCard: {
    backgroundColor: '#fff', borderRadius: 24,
    padding: SPACING.lg, marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  weekTotal: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barTrack: {
    flex: 1, width: '100%', justifyContent: 'flex-end',
    backgroundColor: '#F3F4F6', borderRadius: 8, overflow: 'hidden',
  },
  bar: { width: '100%', borderRadius: 8 },
  barLabel: { marginTop: 4, fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  barLabelActive: { color: COLORS.primary, fontWeight: '800' },

  habitRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: SPACING.md, marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  habitIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
  },
  habitEmoji: { fontSize: 24 },
  habitInfo: { flex: 1 },
  habitNameRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  habitName: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  habitBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneBadge: { fontSize: 14, fontWeight: '700' },
  streakNum: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  progressTrack: {
    flex: 1, height: 5, backgroundColor: '#F0F0F0',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  goalLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, minWidth: 38 },
  monthlyRate: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

  settingsCard: {
    backgroundColor: '#fff', borderRadius: 20,
    marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, gap: SPACING.md,
  },
  settingIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  settingText: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.text },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: SPACING.md },

  versionText: {
    textAlign: 'center', fontSize: 13,
    color: COLORS.textLight, fontWeight: '500',
    marginTop: SPACING.md, marginBottom: SPACING.sm,
  },
});
