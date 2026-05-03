import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  Modal,
  TextInput,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Task, TaskPriority } from '../types';
import { getTasks, saveTasks } from '../utils/storage';
import { getTodayKey } from '../utils/dateUtils';
import { COLORS, PRIORITY_COLORS, SPACING } from '../theme';

type Filter = 'active' | 'done';

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High', medium: 'Med', low: 'Low', none: 'None',
};

interface Section {
  title: string;
  emoji: string;
  data: Task[];
  color: string;
}

function buildSections(tasks: Task[], today: string): Section[] {
  const active = tasks.filter(t => !t.completed);
  const overdue = active.filter(t => t.dueDate && t.dueDate < today);
  const todayTasks = active.filter(t => t.dueDate === today);
  const upcoming = active.filter(t => t.dueDate && t.dueDate > today);
  const someday = active.filter(t => !t.dueDate);

  const sections: Section[] = [];
  if (overdue.length) sections.push({ title: 'Overdue', emoji: '⚠️', data: overdue, color: COLORS.danger });
  if (todayTasks.length) sections.push({ title: 'Today', emoji: '🎯', data: todayTasks, color: COLORS.primary });
  if (upcoming.length) sections.push({ title: 'Upcoming', emoji: '📅', data: upcoming, color: '#8B5CF6' });
  if (someday.length) sections.push({ title: 'Someday', emoji: '💭', data: someday, color: COLORS.textSecondary });
  return sections;
}

export default function TodoScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const today = getTodayKey();

  useFocusEffect(
    useCallback(() => {
      getTasks().then(setTasks);
    }, [])
  );

  async function handleSave(data: Omit<Task, 'id' | 'createdAt'>) {
    let updated: Task[];
    if (editingTask) {
      updated = tasks.map(t => t.id === editingTask.id ? { ...editingTask, ...data } : t);
    } else {
      const newTask: Task = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      updated = [newTask, ...tasks];
    }
    await saveTasks(updated);
    setTasks(updated);
    setModalVisible(false);
    setEditingTask(null);
  }

  async function handleToggleComplete(task: Task) {
    const updated = tasks.map(t =>
      t.id === task.id
        ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null }
        : t
    );
    await saveTasks(updated);
    setTasks(updated);
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    setModalVisible(true);
  }

  function handleDelete(task: Task) {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const updated = tasks.filter(t => t.id !== task.id);
          await saveTasks(updated);
          setTasks(updated);
        },
      },
    ]);
  }

  function renderTaskRow(task: Task) {
    const isOverdue = !task.completed && task.dueDate && task.dueDate < today;
    const priorityColor = PRIORITY_COLORS[task.priority];
    return (
      <View key={task.id} style={styles.taskRow}>
        <TouchableOpacity onPress={() => handleToggleComplete(task)} style={styles.checkbox}>
          <View style={[styles.checkCircle, task.completed && { backgroundColor: COLORS.success, borderColor: COLORS.success }]}>
            {task.completed && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
          </View>
        </TouchableOpacity>
        <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
        <View style={styles.taskInfo}>
          <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]} numberOfLines={2}>
            {task.title}
          </Text>
          {task.notes ? <Text style={styles.taskNotes} numberOfLines={1}>{task.notes}</Text> : null}
          <View style={styles.taskMeta}>
            {task.dueDate ? (
              <Text style={[styles.dueDate, isOverdue && styles.dueDateOverdue]}>
                {isOverdue ? '⚠️' : '📅'} {task.dueDate}
              </Text>
            ) : null}
            {task.priority !== 'none' ? (
              <View style={[styles.priorityChipSmall, { borderColor: priorityColor }]}>
                <Text style={[styles.priorityChipSmallText, { color: priorityColor }]}>
                  {PRIORITY_LABELS[task.priority]}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.taskActions}>
          <TouchableOpacity onPress={() => handleEdit(task)} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(task)} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const sections = buildSections(tasks, today);
  const doneTasks = tasks.filter(t => t.completed);
  const activeCount = tasks.filter(t => !t.completed).length;
  const doneCount = doneTasks.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSub}>{activeCount} active · {doneCount} done</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setEditingTask(null); setModalVisible(true); }}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['active', 'done'] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'active' ? `Active (${activeCount})` : `Done (${doneCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filter === 'active' ? (
          sections.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🗒️</Text>
              <Text style={styles.emptyTitle}>No tasks yet!</Text>
              <Text style={styles.emptySubtext}>Tap "+ Add" to create your first task</Text>
            </View>
          ) : (
            sections.map(section => (
              <View key={section.title} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEmoji}>{section.emoji}</Text>
                  <Text style={[styles.sectionTitle, { color: section.color }]}>{section.title}</Text>
                  <View style={[styles.sectionBadge, { backgroundColor: section.color + '20' }]}>
                    <Text style={[styles.sectionBadgeText, { color: section.color }]}>{section.data.length}</Text>
                  </View>
                </View>
                {section.data.map(task => renderTaskRow(task))}
              </View>
            ))
          )
        ) : (
          doneTasks.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>✅</Text>
              <Text style={styles.emptyTitle}>Nothing completed yet</Text>
              <Text style={styles.emptySubtext}>Complete tasks to see them here</Text>
            </View>
          ) : (
            doneTasks.map(task => renderTaskRow(task))
          )
        )}
      </ScrollView>

      <AddTaskModal
        visible={modalVisible}
        task={editingTask}
        onSave={handleSave}
        onClose={() => { setModalVisible(false); setEditingTask(null); }}
      />
    </SafeAreaView>
  );
}

// ─── Add / Edit Task Modal ────────────────────────────────────────────────────

type TaskFormData = Omit<Task, 'id' | 'createdAt'>;

function AddTaskModal({
  visible, task, onSave, onClose,
}: {
  visible: boolean;
  task: Task | null;
  onSave: (data: TaskFormData) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('none');
  const [urgent, setUrgent] = useState(false);
  const [important, setImportant] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [customDateInput, setCustomDateInput] = useState('');

  const today = getTodayKey();

  function dateOffset(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const DATE_CHIPS = [
    { label: 'No Date', value: null as string | null },
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: dateOffset(1) },
    { label: 'Custom', value: 'custom' as string | null },
  ];

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes);
      setPriority(task.priority);
      setUrgent(task.urgent);
      setImportant(task.important);
      setDueDate(task.dueDate);
      setCustomDateInput(task.dueDate ?? '');
    } else {
      setTitle('');
      setNotes('');
      setPriority('none');
      setUrgent(false);
      setImportant(false);
      setDueDate(null);
      setCustomDateInput('');
    }
  }, [task, visible]);

  function handleSave() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a task title.');
      return;
    }
    let finalDate = dueDate;
    if (dueDate === 'custom') {
      const trimmed = customDateInput.trim();
      if (trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        finalDate = trimmed;
      } else if (trimmed) {
        Alert.alert('Invalid date', 'Use format YYYY-MM-DD, e.g. 2026-05-15');
        return;
      } else {
        finalDate = null;
      }
    }
    onSave({
      title: title.trim(),
      notes: notes.trim(),
      priority,
      urgent,
      important,
      dueDate: finalDate,
      completed: task?.completed ?? false,
      completedAt: task?.completedAt ?? null,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={mStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={mStyles.sheet}
          contentContainerStyle={mStyles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={mStyles.handle} />
          <Text style={mStyles.title}>{task ? 'Edit Task' : 'New Task'}</Text>

          <Text style={mStyles.label}>Title</Text>
          <TextInput
            style={mStyles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor={COLORS.textLight}
            maxLength={120}
            autoFocus={!task}
          />

          <Text style={mStyles.label}>Notes <Text style={mStyles.optional}>(optional)</Text></Text>
          <TextInput
            style={[mStyles.input, { height: 68, textAlignVertical: 'top', paddingTop: 12 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add details..."
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={300}
          />

          <Text style={mStyles.label}>Priority</Text>
          <View style={mStyles.chipRow}>
            {(['none', 'low', 'medium', 'high'] as TaskPriority[]).map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setPriority(p)}
                style={[
                  mStyles.priorityChip,
                  { borderColor: PRIORITY_COLORS[p] },
                  priority === p && { backgroundColor: PRIORITY_COLORS[p] },
                ]}
              >
                <Text style={[mStyles.priorityChipText, { color: priority === p ? '#fff' : PRIORITY_COLORS[p] }]}>
                  {PRIORITY_LABELS[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={mStyles.label}>Due Date</Text>
          <View style={mStyles.dateChipRow}>
            {DATE_CHIPS.map(chip => (
              <TouchableOpacity
                key={chip.label}
                onPress={() => setDueDate(chip.value)}
                style={[mStyles.dateChip, dueDate === chip.value && mStyles.dateChipActive]}
              >
                <Text style={[mStyles.dateChipText, dueDate === chip.value && mStyles.dateChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {dueDate === 'custom' && (
            <TextInput
              style={[mStyles.input, { marginBottom: SPACING.md }]}
              value={customDateInput}
              onChangeText={setCustomDateInput}
              placeholder="YYYY-MM-DD  e.g. 2026-05-15"
              placeholderTextColor={COLORS.textLight}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          )}

          <View style={mStyles.btnRow}>
            <TouchableOpacity style={mStyles.cancelBtn} onPress={onClose}>
              <Text style={mStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mStyles.saveBtn} onPress={handleSave}>
              <Text style={mStyles.saveText}>{task ? 'Save Changes' : 'Add Task'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 30, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  addBtn: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 22, backgroundColor: COLORS.primary,
  },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F3F4F6',
  },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },

  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: 80 },

  section: { marginBottom: SPACING.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm,
  },
  sectionEmoji: { fontSize: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionBadge: {
    paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: '700' },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  checkbox: { marginRight: SPACING.sm, paddingTop: 2 },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#DDD',
    alignItems: 'center', justifyContent: 'center',
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.sm, marginTop: 6 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, lineHeight: 20 },
  taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  taskNotes: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' },
  dueDate: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  dueDateOverdue: { color: COLORS.danger },
  priorityChipSmall: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1,
  },
  priorityChipSmallText: { fontSize: 10, fontWeight: '700' },
  taskActions: { flexDirection: 'row', gap: 2, paddingTop: 0 },
  iconBtn: { padding: 5 },
  iconBtnText: { fontSize: 15 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: SPACING.xl },
  emptyEmoji: { fontSize: 52, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '92%', backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  sheetContent: { padding: SPACING.lg, paddingBottom: 48 },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: SPACING.md,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  label: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: SPACING.sm,
  },
  optional: { fontSize: 11, fontWeight: '500', textTransform: 'none', color: COLORS.textLight },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    paddingHorizontal: SPACING.md, paddingVertical: 13,
    fontSize: 16, color: COLORS.text, marginBottom: SPACING.md,
  },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  priorityChip: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1.5,
  },
  priorityChipText: { fontSize: 13, fontWeight: '700' },
  dateChipRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md, flexWrap: 'wrap' },
  dateChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  dateChipActive: { backgroundColor: COLORS.primary },
  dateChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  dateChipTextActive: { color: '#fff' },
  btnRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: {
    flex: 1, paddingVertical: 15, borderRadius: 16,
    alignItems: 'center', backgroundColor: '#F5F5F5',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  saveBtn: {
    flex: 2, paddingVertical: 15, borderRadius: 16,
    alignItems: 'center', backgroundColor: COLORS.primary,
  },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
