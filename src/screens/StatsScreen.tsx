import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Habit, HabitLog } from '../types';
import { getHabits, getLogs } from '../utils/storage';
import { getLastNDays, getDayLabel, getTodayKey } from '../utils/dateUtils';
import { getCurrentStreak, getLongestStreak, getMonthlyRate } from '../utils/habitUtils';
import { COLORS, PASTEL_COLORS, SPACING } from '../theme';

const CELL = 17;
const CELL_GAP = 3;
const HEATMAP_WEEKS = 14;

function getHeatColor(count: number, habitCount: number): string {
  if (habitCount === 0 || count === 0) return '#E5E7EB';
  const rate = Math.min(count / habitCount, 1);
  const opacity = 0.22 + rate * 0.78;
  return `rgba(255, 107, 53, ${opacity.toFixed(2)})`;
}

export default function StatsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog>({});

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [h, l] = await Promise.all([getHabits(), getLogs()]);
        setHabits(h);
        setLogs(l);
      }
      load();
    }, [])
  );

  const today = getTodayKey();
  const last7 = getLastNDays(7);
  const heatmapDays = getLastNDays(HEATMAP_WEEKS * 7); // 98 days
  const maxPossible = habits.length || 1;

  // Split heatmap days into 14 columns of 7
  const heatWeeks: string[][] = [];
  for (let i = 0; i < heatmapDays.length; i += 7) {
    heatWeeks.push(heatmapDays.slice(i, i + 7));
  }

  const totalThisWeek = last7.reduce(
    (acc, date) => acc + (logs[date]?.length || 0),
    0
  );

  const bestHabit = habits.length
    ? [...habits].sort(
        (a, b) => getCurrentStreak(b.id, logs, b.reminderDays) - getCurrentStreak(a.id, logs, a.reminderDays)
      )[0]
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="grid-outline" size={24} color={COLORS.text} />
        <Text style={styles.headerTitle}>Your Stats</Text>
        <Ionicons name="calendar-outline" size={24} color={COLORS.text} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Summary row */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalThisWeek}</Text>
            <Text style={styles.summaryLabel}>This week</Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1.4 }]}>
            {bestHabit ? (
              <>
                <View style={styles.summaryRow2}>
                  <Text style={styles.summaryValueOrange}>
                    {getCurrentStreak(bestHabit.id, logs, bestHabit.reminderDays)}
                  </Text>
                  <Text style={styles.summaryEmoji}>{bestHabit.emoji}</Text>
                </View>
                <Text style={styles.summaryLabel}>Best streak · {bestHabit.name}</Text>
              </>
            ) : (
              <Text style={styles.summaryLabel}>No habits yet</Text>
            )}
          </View>
        </View>

        {/* Bar chart */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Weekly Activity</Text>
          <View style={styles.chart}>
            {last7.map(date => {
              const count = logs[date]?.length || 0;
              const pct = count / maxPossible;
              const isToday = date === today;
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
                    {getDayLabel(date)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Heatmap */}
        <View style={styles.heatmapCard}>
          <Text style={styles.cardTitle}>Activity Heatmap</Text>
          <Text style={styles.heatmapSubtitle}>Last 14 weeks</Text>
          <View style={styles.heatmapGrid}>
            {Array.from({ length: 7 }).map((_, rowIndex) => (
              <View key={rowIndex} style={styles.heatmapRow}>
                {heatWeeks.map((week, colIndex) => {
                  const date = week[rowIndex];
                  const isFuture = date > today;
                  const count = isFuture ? 0 : (logs[date]?.length || 0);
                  const bg = isFuture ? 'transparent' : getHeatColor(count, habits.length);
                  return (
                    <View
                      key={colIndex}
                      style={[
                        styles.heatCell,
                        { backgroundColor: bg },
                        colIndex < heatWeeks.length - 1 && { marginRight: CELL_GAP },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          {/* Legend */}
          <View style={styles.heatLegend}>
            <Text style={styles.heatLegendLabel}>Less</Text>
            {[0, 0.22, 0.45, 0.7, 1].map((op, i) => (
              <View
                key={i}
                style={[
                  styles.heatLegendCell,
                  {
                    backgroundColor:
                      op === 0 ? '#E5E7EB' : `rgba(255, 107, 53, ${op})`,
                    marginRight: i < 4 ? 3 : 0,
                  },
                ]}
              />
            ))}
            <Text style={styles.heatLegendLabel}>More</Text>
          </View>
        </View>

        {/* Challenges */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Challenges</Text>
        </View>

        {habits.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>No habits to show yet.</Text>
            <Text style={styles.emptySubtext}>Add habits and start tracking!</Text>
          </View>
        ) : (
          habits.map((habit, index) => {
            const streak = getCurrentStreak(habit.id, logs, habit.reminderDays);
            const best = getLongestStreak(habit.id, logs);
            const monthly = getMonthlyRate(habit.id, logs, habit.reminderDays);
            const doneToday = (logs[today] || []).includes(habit.id);
            const flameSize = Math.min(18 + streak * 1.5, 32);

            return (
              <View key={habit.id} style={styles.challengeItem}>
                <View
                  style={[
                    styles.challengeIcon,
                    { backgroundColor: PASTEL_COLORS[index % PASTEL_COLORS.length] },
                  ]}
                >
                  <Text style={styles.challengeEmoji}>{habit.emoji}</Text>
                </View>
                <View style={styles.challengeInfo}>
                  <Text style={styles.challengeName}>{habit.name}</Text>
                  <View style={styles.challengeStats}>
                    <Text
                      style={[
                        styles.challengeStatus,
                        { color: doneToday ? COLORS.success : COLORS.primary },
                      ]}
                    >
                      {doneToday ? '✓ Done' : '○ Pending'}
                    </Text>
                    <Text style={styles.monthlyRate}>{monthly}% this month</Text>
                  </View>
                  {best > 0 && (
                    <Text style={styles.bestStreakText}>Best: {best} days</Text>
                  )}
                </View>
                <View style={styles.challengeRight}>
                  <Text style={{ fontSize: flameSize }}>🔥</Text>
                  <Text style={styles.streakNum}>{streak}</Text>
                  <Text style={styles.streakUnit}>days</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
  },
  summaryValueOrange: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
  },
  summaryRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryEmoji: {
    fontSize: 22,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 110,
    gap: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 10,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  barLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  heatmapCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heatmapSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.md,
    marginTop: -8,
  },
  heatmapGrid: {
    gap: CELL_GAP,
  },
  heatmapRow: {
    flexDirection: 'row',
    height: CELL,
  },
  heatCell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
  },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: SPACING.sm,
  },
  heatLegendLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  heatLegendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  challengeIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  challengeEmoji: {
    fontSize: 26,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  challengeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  challengeStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  monthlyRate: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  bestStreakText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  challengeRight: {
    alignItems: 'center',
    minWidth: 44,
  },
  streakNum: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    lineHeight: 22,
  },
  streakUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
