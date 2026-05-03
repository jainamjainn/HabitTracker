import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Habit, HabitLog } from '../types';
import { getHabits, getLogs, toggleHabitCompletion, getUserProfile } from '../utils/storage';
import { getTodayKey, getLastNDays, getDayLabel, getGreeting } from '../utils/dateUtils';
import { getCurrentStreak } from '../utils/habitUtils';
import { COLORS, SPACING } from '../theme';

export default function TodayScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog>({});
  const [selectedDate, setSelectedDate] = useState(getTodayKey());
  const [userName, setUserName] = useState('');

  const weekDays = getLastNDays(7);
  const today = getTodayKey();

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [h, l, profile] = await Promise.all([getHabits(), getLogs(), getUserProfile()]);
        setHabits(h);
        setLogs(l);
        setUserName(profile?.name ?? '');
      }
      load();
    }, [])
  );

  async function handleToggle(habitId: string) {
    const updated = await toggleHabitCompletion(habitId, selectedDate);
    setLogs(prev => ({ ...prev, [selectedDate]: updated }));
  }

  const selectedDayOfWeek = new Date(selectedDate + 'T00:00:00').getDay();
  const todayHabits = habits.filter(
    h => h.reminderDays.length === 0 || h.reminderDays.includes(selectedDayOfWeek)
  );

  const completedIds = logs[selectedDate] || [];
  const pendingHabits = todayHabits.filter(h => !completedIds.includes(h.id));
  const doneHabits = todayHabits.filter(h => completedIds.includes(h.id));
  const allDone = todayHabits.length > 0 && pendingHabits.length === 0;

  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const dayName = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const isViewingToday = selectedDate === today;

  const completionPct =
    todayHabits.length > 0
      ? Math.round((doneHabits.length / todayHabits.length) * 100)
      : 0;

  function renderCard(item: Habit) {
    const done = completedIds.includes(item.id);
    const streak = getCurrentStreak(item.id, logs, item.reminderDays);
    const goal = item.streakGoal ?? 30;
    const progress = Math.min(streak / goal, 1);
    const color = item.color || COLORS.primary;

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => handleToggle(item.id)}
        activeOpacity={0.78}
        style={[styles.card, done && styles.cardDone]}
      >
        {/* Translucent fill showing streak progress */}
        <View
          style={[
            styles.cardFill,
            { width: `${Math.max(progress * 100, 0)}%`, backgroundColor: color },
          ]}
        />
        {/* Left accent strip */}
        <View style={[styles.accentBar, { backgroundColor: color }]} />
        {/* Main content */}
        <View style={styles.cardContent}>
          <View style={styles.cardRow}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.cardMid}>
              <Text style={[styles.habitName, done && styles.habitNameDone]}>{item.name}</Text>
              {item.motivationText ? (
                <Text style={styles.motivText} numberOfLines={1}>
                  {item.motivationText}
                </Text>
              ) : null}
            </View>
            {done ? (
              <View style={[styles.badge, { backgroundColor: COLORS.success }]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            ) : streak > 0 ? (
              <View style={styles.streakBadge}>
                <Text style={styles.streakBadgeText}>🔥 {streak}</Text>
              </View>
            ) : null}
          </View>
          {/* Progress bar + label */}
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%`, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>{streak}/{goal}d</Text>
          </View>
          {item.reminderTime ? (
            <Text style={styles.timeText}>⏰ {item.reminderTime}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {getGreeting()}{userName ? `, ${userName}` : ''}! 👋
          </Text>
          <Text style={styles.headerDate}>
            {selectedDateObj.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        {todayHabits.length > 0 && (
          <View style={styles.headerRight}>
            <Text style={styles.completionPct}>{completionPct}%</Text>
            <Text style={styles.completionLabel}>done</Text>
          </View>
        )}
      </View>

      {/* Week strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekStrip}
      >
        {weekDays.map(dateStr => {
          const d = new Date(dateStr + 'T00:00:00');
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          return (
            <TouchableOpacity
              key={dateStr}
              style={styles.dayItem}
              onPress={() => setSelectedDate(dateStr)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>
                {getDayLabel(dateStr)}
              </Text>
              <View style={[styles.dayCircle, isSelected && styles.dayCircleActive]}>
                <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>
                  {String(d.getDate()).padStart(2, '0')}
                </Text>
              </View>
              {isToday && !isSelected && <View style={styles.todayDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* All done banner */}
        {allDone && (
          <View style={styles.allDoneBox}>
            <Text style={styles.allDoneEmoji}>🎉</Text>
            <Text style={styles.allDoneText}>
              All done{userName ? `, ${userName}` : ''}!
            </Text>
            <Text style={styles.allDoneSubtext}>Great work — keep the streak alive!</Text>
          </View>
        )}

        {/* Pending habits */}
        {pendingHabits.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{dayName}</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingHabits.length} pending</Text>
              </View>
            </View>
            <View style={styles.cardList}>{pendingHabits.map(h => renderCard(h))}</View>
          </>
        )}

        {/* Completed habits */}
        {doneHabits.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Completed</Text>
              <Text style={styles.doneCount}>{doneHabits.length} done ✓</Text>
            </View>
            <View style={styles.cardList}>{doneHabits.map(h => renderCard(h))}</View>
          </>
        )}

        {/* Empty state */}
        {todayHabits.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>No habits today</Text>
            <Text style={styles.emptySubtext}>
              {habits.length === 0
                ? 'Go to the Habits tab to add your first habit'
                : 'No habits scheduled for this day'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: '#fff',
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  headerDate: { fontSize: 13, color: '#888', marginTop: 2, fontWeight: '500' },
  headerRight: { alignItems: 'center', marginLeft: SPACING.md },
  completionPct: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  completionLabel: { fontSize: 11, fontWeight: '600', color: '#888' },
  weekStrip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayItem: { alignItems: 'center', marginRight: SPACING.md },
  dayLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6 },
  dayLabelActive: { color: COLORS.primary },
  dayCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  dayCircleActive: { backgroundColor: COLORS.primary },
  dayNum: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  dayNumActive: { color: '#fff' },
  todayDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: COLORS.primary, marginTop: 3,
  },
  scrollContent: { paddingTop: SPACING.md, paddingBottom: SPACING.xl },

  allDoneBox: {
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: SPACING.md,
    borderRadius: 20,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
  },
  allDoneEmoji: { fontSize: 40, marginBottom: 6 },
  allDoneText: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  allDoneSubtext: { fontSize: 13, color: '#888' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  pendingBadge: {
    backgroundColor: '#FFF0E6',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pendingBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  doneCount: { fontSize: 13, fontWeight: '600', color: COLORS.success },

  cardList: { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },

  // Habit card — rectangular with fill
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 10,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardDone: { opacity: 0.7 },
  cardFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    opacity: 0.13,
  },
  accentBar: { width: 5, alignSelf: 'stretch' },
  cardContent: { flex: 1, padding: SPACING.md },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  emoji: { fontSize: 30, marginRight: SPACING.sm },
  cardMid: { flex: 1 },
  habitName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  habitNameDone: { color: '#888' },
  motivText: {
    fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 2,
  },
  badge: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  streakBadge: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  streakBadgeText: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  progressTrack: {
    flex: 1, height: 5,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: {
    fontSize: 11, fontWeight: '700', color: '#888',
    minWidth: 38, textAlign: 'right',
  },
  timeText: { fontSize: 11, color: '#888', fontWeight: '500' },

  empty: {
    alignItems: 'center', paddingTop: 64, paddingHorizontal: SPACING.xl,
  },
  emptyEmoji: { fontSize: 52, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: SPACING.sm },
  emptySubtext: {
    fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22,
  },
});
