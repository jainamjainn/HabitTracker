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
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Habit } from '../types';
import { getHabits, saveHabits } from '../utils/storage';
import { scheduleHabitReminder, cancelHabitReminders } from '../utils/notifications';
import { COLORS, PASTEL_COLORS, PRESET_HABITS, PresetCategory, SPACING } from '../theme';
import AddHabitModal from '../components/AddHabitModal';

type HabitFormData = Omit<Habit, 'id' | 'notificationIds' | 'createdAt'>;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getReminderLabel(days: number[]): string {
  if (days.length === 0 || days.length === 7) return 'Every day';
  return days.map(d => DAY_NAMES[d]).join(', ');
}

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [pickerCategory, setPickerCategory] = useState<PresetCategory>('Popular');

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

  async function handleAddPreset(preset: { name: string; emoji: string }) {
    const exists = habits.some(h => h.name === preset.name);
    if (exists) {
      Alert.alert('Already added', `"${preset.name}" is already in your habits.`);
      return;
    }
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: preset.name,
      emoji: preset.emoji,
      color: COLORS.primary,
      motivationText: null,
      reminderTime: null,
      reminderDays: [],
      notificationIds: [],
      streakGoal: 30,
      habitType: 'build',
      timeRange: 'anytime',
      createdAt: new Date().toISOString(),
    };
    const updated = [...habits, newHabit];
    await saveHabits(updated);
    setHabits(updated);
    setPickerVisible(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Habits</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setPickerVisible(true)} activeOpacity={0.85}>
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

      {/* Habit Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={pStyles.overlay}>
          <SafeAreaView style={pStyles.sheet}>
            <View style={pStyles.header}>
              <Text style={pStyles.title}>New Habit</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Category tabs */}
            <View style={pStyles.tabs}>
              {(['Popular', 'Health', 'Sports'] as PresetCategory[]).map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setPickerCategory(cat)}
                  style={[pStyles.tab, pickerCategory === cat && pStyles.tabActive]}
                >
                  <Text style={[pStyles.tabText, pickerCategory === cat && pStyles.tabTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preset list */}
            <ScrollView style={pStyles.list} showsVerticalScrollIndicator={false}>
              {PRESET_HABITS.filter(p => p.category === pickerCategory).map(preset => {
                const added = habits.some(h => h.name === preset.name);
                return (
                  <View key={preset.name} style={pStyles.presetRow}>
                    <Text style={pStyles.presetEmoji}>{preset.emoji}</Text>
                    <Text style={pStyles.presetName}>{preset.name}</Text>
                    <TouchableOpacity
                      onPress={() => handleAddPreset(preset)}
                      style={[pStyles.addPresetBtn, added && pStyles.addPresetBtnDone]}
                      disabled={added}
                    >
                      <Ionicons name={added ? 'checkmark' : 'add'} size={20} color={added ? COLORS.success : '#fff'} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            {/* Custom habit button */}
            <View style={pStyles.footer}>
              <TouchableOpacity
                style={pStyles.customBtn}
                onPress={() => { setPickerVisible(false); openAddModal(); }}
                activeOpacity={0.85}
              >
                <Ionicons name="star-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={pStyles.customBtnText}>Custom Habit</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

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

const pStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  tabs: {
    flexDirection: 'row', paddingHorizontal: SPACING.md,
    gap: SPACING.sm, marginBottom: SPACING.md,
  },
  tab: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: SPACING.md },
  presetRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  presetEmoji: { fontSize: 26, marginRight: SPACING.md },
  presetName: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.text },
  addPresetBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  addPresetBtnDone: { backgroundColor: '#F3F4F6' },
  footer: {
    padding: SPACING.lg, paddingBottom: SPACING.xl,
  },
  customBtn: {
    backgroundColor: COLORS.primary, borderRadius: 18,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
  },
  customBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
