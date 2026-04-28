import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Habit, HabitType, TimeRange } from '../types';
import { COLORS, HABIT_COLORS, HABIT_EMOJIS, SPACING } from '../theme';

type HabitFormData = Omit<Habit, 'id' | 'notificationIds' | 'createdAt'>;

interface Props {
  visible: boolean;
  habit?: Habit | null;
  onSave: (data: HabitFormData) => void;
  onClose: () => void;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const GOAL_PRESETS = [7, 14, 21, 30, 60, 100];

export default function AddHabitModal({ visible, habit, onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💪');
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [motivationText, setMotivationText] = useState('');
  const [habitType, setHabitType] = useState<HabitType>('build');
  const [timeRange, setTimeRange] = useState<TimeRange>('anytime');
  const [reminderOn, setReminderOn] = useState(false);
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [reminderDays, setReminderDays] = useState<number[]>([]);
  const [streakGoal, setStreakGoal] = useState(30);
  const [goalInput, setGoalInput] = useState('30');

  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setEmoji(habit.emoji);
      setColor(habit.color);
      setMotivationText(habit.motivationText ?? '');
      setHabitType(habit.habitType ?? 'build');
      setTimeRange(habit.timeRange ?? 'anytime');
      setReminderDays(habit.reminderDays ?? []);
      setStreakGoal(habit.streakGoal ?? 30);
      setGoalInput(String(habit.streakGoal ?? 30));
      if (habit.reminderTime) {
        const [h, m] = habit.reminderTime.split(':');
        setHour(h);
        setMinute(m);
        setReminderOn(true);
      } else {
        setReminderOn(false);
        setHour('08');
        setMinute('00');
      }
    } else {
      setName('');
      setEmoji('💪');
      setColor(HABIT_COLORS[0]);
      setMotivationText('');
      setHabitType('build');
      setTimeRange('anytime');
      setReminderOn(false);
      setHour('08');
      setMinute('00');
      setReminderDays([]);
      setStreakGoal(30);
      setGoalInput('30');
    }
  }, [habit, visible]);

  function toggleDay(day: number) {
    setReminderDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  function handleGoalInput(val: string) {
    setGoalInput(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0 && n <= 999) setStreakGoal(n);
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a name for your habit.');
      return;
    }
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    if (reminderOn && (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59)) {
      Alert.alert('Invalid time', 'Please enter a valid time (hour 0–23, minute 0–59).');
      return;
    }
    const goal = parseInt(goalInput, 10);
    onSave({
      name: name.trim(),
      emoji,
      color,
      motivationText: motivationText.trim() || null,
      habitType,
      timeRange,
      reminderTime: reminderOn
        ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        : null,
      reminderDays: reminderOn ? reminderDays : [],
      streakGoal: !isNaN(goal) && goal > 0 ? goal : 30,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheet}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{habit ? 'Edit Habit' : 'New Habit'}</Text>

          {/* Name */}
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Morning Run"
            placeholderTextColor={COLORS.textLight}
            maxLength={40}
          />

          {/* Motivation */}
          <Text style={styles.label}>
            Why? <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={motivationText}
            onChangeText={setMotivationText}
            placeholder="e.g. To feel healthier every day"
            placeholderTextColor={COLORS.textLight}
            maxLength={80}
          />

          {/* Habit Type */}
          <Text style={styles.label}>Habit Type</Text>
          <View style={styles.typeToggle}>
            {(['build', 'quit'] as HabitType[]).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setHabitType(t)}
                style={[styles.typeBtn, habitType === t && { backgroundColor: color }]}
              >
                <Text style={[styles.typeBtnText, habitType === t && styles.typeBtnTextActive]}>
                  {t === 'build' ? '🔨 Build' : '🚫 Quit'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Time Range */}
          <Text style={styles.label}>Time of Day</Text>
          <View style={styles.timeRangeRow}>
            {(['anytime', 'morning', 'afternoon', 'evening'] as TimeRange[]).map(t => {
              const icons: Record<TimeRange, string> = { anytime: '🕐', morning: '🌅', afternoon: '☀️', evening: '🌙' };
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTimeRange(t)}
                  style={[styles.timeRangeBtn, timeRange === t && { backgroundColor: color, borderColor: color }]}
                >
                  <Text style={styles.timeRangeEmoji}>{icons[t]}</Text>
                  <Text style={[styles.timeRangeTxt, timeRange === t && styles.timeRangeTxtActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Emoji picker */}
          <Text style={styles.label}>Icon</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.emojiScroll}
          >
            {HABIT_EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Color picker */}
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {HABIT_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  color === c && styles.colorDotActive,
                ]}
              />
            ))}
          </View>

          {/* Streak Goal */}
          <Text style={styles.label}>Streak Goal</Text>
          <View style={styles.goalPresetRow}>
            {GOAL_PRESETS.map(g => (
              <TouchableOpacity
                key={g}
                onPress={() => { setStreakGoal(g); setGoalInput(String(g)); }}
                style={[styles.goalChip, streakGoal === g && { backgroundColor: color }]}
              >
                <Text style={[styles.goalChipText, streakGoal === g && styles.goalChipTextActive]}>
                  {g}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.goalCustomRow}>
            <TextInput
              style={styles.goalInput}
              value={goalInput}
              onChangeText={handleGoalInput}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="30"
              placeholderTextColor={COLORS.textLight}
            />
            <Text style={styles.goalUnit}>day streak goal</Text>
          </View>

          {/* Reminder toggle */}
          <View style={styles.reminderRow}>
            <Text style={styles.label}>Daily Reminder</Text>
            <Switch
              value={reminderOn}
              onValueChange={v => {
                setReminderOn(v);
                if (!v) setReminderDays([]);
              }}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>

          {reminderOn && (
            <>
              {/* Time inputs */}
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <TextInput
                    style={styles.timeInput}
                    value={hour}
                    onChangeText={v => setHour(v.replace(/\D/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="08"
                    placeholderTextColor={COLORS.textLight}
                  />
                  <Text style={styles.timeHint}>HH</Text>
                </View>
                <Text style={styles.timeSep}>:</Text>
                <View style={styles.timeField}>
                  <TextInput
                    style={styles.timeInput}
                    value={minute}
                    onChangeText={v => setMinute(v.replace(/\D/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor={COLORS.textLight}
                  />
                  <Text style={styles.timeHint}>MM</Text>
                </View>
              </View>

              {/* Day picker */}
              <Text style={styles.label}>Repeat on</Text>
              <View style={styles.dayPickerRow}>
                {DAY_LABELS.map((lbl, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => toggleDay(i)}
                    style={[styles.dayBtn, reminderDays.includes(i) && { backgroundColor: color }]}
                  >
                    <Text
                      style={[
                        styles.dayBtnText,
                        reminderDays.includes(i) && styles.dayBtnTextActive,
                      ]}
                    >
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {reminderDays.length === 0 && (
                <Text style={styles.dayHint}>No days selected = reminds every day</Text>
              )}
            </>
          )}

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: color }]}
              onPress={handleSave}
            >
              <Text style={styles.saveText}>{habit ? 'Save Changes' : 'Add Habit'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetScroll: {
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheet: { padding: SPACING.lg, paddingBottom: 48 },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: SPACING.md,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  label: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: SPACING.sm,
  },
  optional: {
    fontSize: 11, fontWeight: '500', textTransform: 'none', color: COLORS.textLight,
  },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    paddingHorizontal: SPACING.md, paddingVertical: 13,
    fontSize: 16, color: COLORS.text, marginBottom: SPACING.md,
  },
  emojiScroll: { marginBottom: SPACING.md },
  emojiBtn: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.sm, backgroundColor: '#F8F8F8',
  },
  emojiBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2, borderColor: COLORS.primary,
  },
  emojiText: { fontSize: 24 },
  colorRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: SPACING.sm, marginBottom: SPACING.md,
  },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
  colorDotActive: { borderWidth: 3, borderColor: COLORS.text },

  typeToggle: {
    flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md,
  },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14,
    alignItems: 'center', backgroundColor: '#F3F4F6',
  },
  typeBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  typeBtnTextActive: { color: '#fff' },

  timeRangeRow: {
    flexDirection: 'row', gap: 6, marginBottom: SPACING.md, flexWrap: 'wrap',
  },
  timeRangeBtn: {
    flex: 1, minWidth: 70, paddingVertical: 10, borderRadius: 14,
    alignItems: 'center', backgroundColor: '#F3F4F6',
    borderWidth: 1.5, borderColor: '#F3F4F6',
  },
  timeRangeEmoji: { fontSize: 18, marginBottom: 2 },
  timeRangeTxt: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  timeRangeTxtActive: { color: '#fff' },

  // Streak goal
  goalPresetRow: {
    flexDirection: 'row', gap: 8, marginBottom: SPACING.sm, flexWrap: 'wrap',
  },
  goalChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#F3F4F6',
  },
  goalChipText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  goalChipTextActive: { color: '#fff' },
  goalCustomRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: SPACING.md, marginBottom: SPACING.md,
  },
  goalInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    width: 72, paddingVertical: 10, textAlign: 'center',
    fontSize: 20, fontWeight: '700', color: COLORS.text,
  },
  goalUnit: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },

  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  timeRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    gap: SPACING.sm, marginBottom: SPACING.md,
  },
  timeField: { alignItems: 'center' },
  timeInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    width: 68, paddingVertical: 10, textAlign: 'center',
    fontSize: 22, fontWeight: '700', color: COLORS.text,
  },
  timeHint: { fontSize: 11, color: COLORS.textLight, marginTop: 4, fontWeight: '600' },
  timeSep: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 18 },
  dayPickerRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.xs },
  dayBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  dayBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  dayBtnTextActive: { color: '#fff' },
  dayHint: {
    fontSize: 12, color: COLORS.textLight,
    marginBottom: SPACING.md, marginTop: 4,
  },
  btnRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: {
    flex: 1, paddingVertical: 15, borderRadius: 16,
    alignItems: 'center', backgroundColor: '#F5F5F5',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  saveBtn: { flex: 2, paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
