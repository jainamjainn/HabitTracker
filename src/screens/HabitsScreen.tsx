import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Habit } from '../types';
import { getHabits, saveHabits } from '../utils/storage';
import { scheduleHabitReminder, cancelHabitReminders } from '../utils/notifications';
import { COLORS, PASTEL_COLORS, SPACING } from '../theme';
import AddHabitModal from '../components/AddHabitModal';

type HabitFormData = Omit<Habit, 'id' | 'notificationIds' | 'createdAt'>;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getReminderLabel(days: number[]): string {
  if (days.length === 0 || days.length === 7) return 'Every day';
  return days.map(d => DAY_NAMES[d]).join(', ');
}

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  useFocusEffect(
    useCallback(() => {
      getHabits().then(setHabits);
    }, [])
  );

  async function handleSave(data: HabitFormData) {
    let updatedHabits: Habit[];

    if (editingHabit) {
      await cancelHabitReminders(editingHabit.notificationIds);
      let notifIds: string[] = [];
      if (data.reminderTime) {
        notifIds = await scheduleHabitReminder(data.name, data.reminderTime, data.reminderDays);
      }
      updatedHabits = habits.map(h =>
        h.id === editingHabit.id
          ? { ...editingHabit, ...data, notificationIds: notifIds }
          : h
      );
    } else {
      let notifIds: string[] = [];
      if (data.reminderTime) {
        notifIds = await scheduleHabitReminder(data.name, data.reminderTime, data.reminderDays);
      }
      const newHabit: Habit = {
        ...data,
        id: Date.now().toString(),
        notificationIds: notifIds,
        createdAt: new Date().toISOString(),
      };
      updatedHabits = [...habits, newHabit];
    }

    await saveHabits(updatedHabits);
    setHabits(updatedHabits);
    setModalVisible(false);
    setEditingHabit(null);
  }

  function handleEdit(habit: Habit) {
    setEditingHabit(habit);
    setModalVisible(true);
  }

  function handleDelete(habit: Habit) {
    Alert.alert('Delete Habit', `Delete "${habit.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelHabitReminders(habit.notificationIds);
          const updated = habits.filter(h => h.id !== habit.id);
          await saveHabits(updated);
          setHabits(updated);
        },
      },
    ]);
  }

  function openAddModal() {
    setEditingHabit(null);
    setModalVisible(true);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Habits</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.85}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={habits}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add your first habit
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.habitRow}>
            <View
              style={[
                styles.habitIcon,
                { backgroundColor: PASTEL_COLORS[index % PASTEL_COLORS.length] },
              ]}
            >
              <Text style={styles.habitEmoji}>{item.emoji}</Text>
            </View>
            <View style={styles.habitInfo}>
              <Text style={styles.habitName}>{item.name}</Text>
              {item.motivationText ? (
                <Text style={styles.motivationText} numberOfLines={1}>
                  {item.motivationText}
                </Text>
              ) : null}
              {item.reminderTime ? (
                <View style={styles.reminderRow}>
                  <Ionicons name="alarm-outline" size={12} color={COLORS.primary} />
                  <Text style={styles.reminderText}>
                    {item.reminderTime} · {getReminderLabel(item.reminderDays ?? [])}
                  </Text>
                </View>
              ) : (
                <Text style={styles.noReminder}>No reminder set</Text>
              )}
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => handleEdit(item)}>
              <Ionicons name="pencil-outline" size={19} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={19} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}
      />

      <AddHabitModal
        visible={modalVisible}
        habit={editingHabit}
        onSave={handleSave}
        onClose={() => {
          setModalVisible(false);
          setEditingHabit(null);
        }}
      />
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
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  habitRow: {
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
  habitIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  habitEmoji: {
    fontSize: 26,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  motivationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 3,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  noReminder: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  iconBtn: {
    padding: SPACING.sm,
    marginLeft: 2,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
