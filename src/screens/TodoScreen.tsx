import React, { useState, useCallback, useEffect } from 'react';
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
  TextInput,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskPriority } from '../types';
import { getTasks, saveTasks } from '../utils/storage';
import { getTodayKey } from '../utils/dateUtils';
import { COLORS, PRIORITY_COLORS, SPACING } from '../theme';

type ViewMode = 'list' | 'matrix';
type Filter = 'all' | 'today' | 'done';

const QUADRANT_INFO = {
  1: { label: 'Urgent & Important', sub: 'Do First', bg: '#FEE2E2', border: '#EF4444', icon: '🔥' },
  2: { label: 'Not Urgent, Important', sub: 'Schedule', bg: '#FEF3C7', border: '#F59E0B', icon: '📅' },
  3: { label: 'Urgent, Unimportant', sub: 'Delegate', bg: '#DBEAFE', border: '#3B82F6', icon: '📤' },
  4: { label: 'Not Urgent & Unimportant', sub: 'Eliminate', bg: '#D1FAE5', border: '#10B981', icon: '🗑️' },
} as const;

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High', medium: 'Med', low: 'Low', none: 'None',
};

function getQuadrant(task: Task): 1 | 2 | 3 | 4 {
  if (task.urgent && task.important) return 1;
  if (!task.urgent && task.important) return 2;
  if (task.urgent && !task.important) return 3;
  return 4;
}

export default function TodoScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filter, setFilter] = useState<Filter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const today = getTodayKey();

  useFocusEffect(
    useCallback(() => {
      getTasks().then(setTasks);
    }, [])
  );

  function getFilteredTasks(): Task[] {
    switch (filter) {
      case 'today':
        return tasks.filter(t => !t.completed && (t.dueDate === today || !t.dueDate));
      case 'done':
        return tasks.filter(t => t.completed);
      default:
        return tasks.filter(t => !t.completed);
    }
  }

  async function handleSave(data: Omit<Task, 'id' | 'createdAt'>) {
    let updated: Task[];
    if (editingTask) {
      updated = tasks.map(t => (t.id === editingTask.id ? { ...editingTask, ...data } : t));
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
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = tasks.filter(t => t.id !== task.id);
          await saveTasks(updated);
          setTasks(updated);
        },
      },
    ]);
  }

  function renderTaskRow(task: Task, compact = false) {
    const isOverdue = !task.completed && task.dueDate && task.dueDate < today;
    const priorityColor = PRIORITY_COLORS[task.priority];
    return (
      <View key={task.id} style={[styles.taskRow, compact && styles.taskRowCompact]}>
        <TouchableOpacity onPress={() => handleToggleComplete(task)} style={styles.checkbox}>
          {task.completed ? (
            <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
          ) : (
            <Ionicons name="ellipse-outline" size={22} color="#CCC" />
          )}
        </TouchableOpacity>
        <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
        <View style={styles.taskInfo}>
          <Text
            style={[styles.taskTitle, task.completed && styles.taskTitleDone]}
            numberOfLines={compact ? 2 : 3}
          >
            {task.title}
          </Text>
          {task.notes && !compact ? (
            <Text style={styles.taskNotes} numberOfLines={1}>{task.notes}</Text>
          ) : null}
          {task.dueDate && !compact ? (
            <Text style={[styles.dueDate, isOverdue ? styles.dueDateOverdue : null]}>
              {isOverdue ? '⚠️ ' : '📅 '}{task.dueDate}
            </Text>
          ) : null}
          {!compact && (task.urgent || task.important) ? (
            <View style={styles.tagRow}>
              {task.urgent ? <View style={styles.tag}><Text style={styles.tagText}>Urgent</Text></View> : null}
              {task.important ? <View style={[styles.tag, styles.tagImportant]}><Text style={[styles.tagText, { color: COLORS.primary }]}>Important</Text></View> : null}
            </View>
          ) : null}
        </View>
        {!compact ? (
          <View style={styles.taskActions}>
            <TouchableOpacity onPress={() => handleEdit(task)} style={styles.iconBtn}>
              <Ionicons name="pencil-outline" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(task)} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }

  function renderMatrixView() {
    const activeTasks = tasks.filter(t => !t.completed);
    return (
      <ScrollView contentContainerStyle={styles.matrixContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.matrixHint}>Tasks are placed based on Urgent + Important toggles</Text>
        <View style={styles.matrixGrid}>
          {([1, 2, 3, 4] as const).map(q => {
            const info = QUADRANT_INFO[q];
            const qTasks = activeTasks.filter(t => getQuadrant(t) === q);
            return (
              <View
                key={q}
                style={[styles.quadrant, { backgroundColor: info.bg, borderColor: info.border }]}
              >
                <View style={styles.quadrantHeader}>
                  <Text style={styles.quadrantIcon}>{info.icon}</Text>
                  <View style={styles.quadrantHeaderText}>
                    <Text style={[styles.quadrantSub, { color: info.border }]}>{info.sub}</Text>
                    <Text style={styles.quadrantLabel}>{info.label}</Text>
                  </View>
                </View>
                {qTasks.length === 0 ? (
                  <Text style={styles.quadrantEmpty}>No tasks</Text>
                ) : (
                  qTasks.slice(0, 5).map(t => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => handleToggleComplete(t)}
                      style={styles.matrixTask}
                    >
                      <Ionicons name="ellipse-outline" size={14} color={info.border} />
                      <Text style={styles.matrixTaskText} numberOfLines={2}>{t.title}</Text>
                    </TouchableOpacity>
                  ))
                )}
                {qTasks.length > 5 ? (
                  <Text style={[styles.quadrantEmpty, { marginTop: 4 }]}>+{qTasks.length - 5} more</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  const filtered = getFilteredTasks();
  const activeCount = tasks.filter(t => !t.completed).length;
  const doneCount = tasks.filter(t => t.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSub}>{activeCount} active · {doneCount} done</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'matrix' && styles.viewToggleActive]}
            onPress={() => setViewMode(v => (v === 'list' ? 'matrix' : 'list'))}
          >
            <Ionicons
              name={viewMode === 'matrix' ? 'list-outline' : 'grid-outline'}
              size={19}
              color={viewMode === 'matrix' ? COLORS.primary : COLORS.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setEditingTask(null); setModalVisible(true); }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'list' ? (
        <>
          <View style={styles.filterRow}>
            {(['all', 'today', 'done'] as Filter[]).map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === 'all' ? `Active (${activeCount})` : f === 'today' ? 'Today' : `Done (${doneCount})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>{filter === 'done' ? '✅' : '🗒️'}</Text>
                <Text style={styles.emptyTitle}>
                  {filter === 'done' ? 'Nothing completed yet' : 'No tasks here!'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {filter === 'done'
                    ? 'Complete tasks to see them here'
                    : 'Tap + to add your first task'}
                </Text>
              </View>
            }
            renderItem={({ item }) => renderTaskRow(item)}
          />
        </>
      ) : (
        renderMatrixView()
      )}

      <AddTaskModal
        visible={modalVisible}
        task={editingTask}
        onSave={handleSave}
        onClose={() => { setModalVisible(false); setEditingTask(null); }}
      />
    </SafeAreaView>
  );
}

// ─── Add / Edit Task Modal ───────────────────────────────────────────────────

type TaskFormData = Omit<Task, 'id' | 'createdAt'>;

function AddTaskModal({
  visible,
  task,
  onSave,
  onClose,
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
    { label: 'In 3 Days', value: dateOffset(3) },
    { label: 'Next Week', value: dateOffset(7) },
  ];

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes);
      setPriority(task.priority);
      setUrgent(task.urgent);
      setImportant(task.important);
      setDueDate(task.dueDate);
    } else {
      setTitle('');
      setNotes('');
      setPriority('none');
      setUrgent(false);
      setImportant(false);
      setDueDate(null);
    }
  }, [task, visible]);

  function handleSave() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a task title.');
      return;
    }
    onSave({
      title: title.trim(),
      notes: notes.trim(),
      priority,
      urgent,
      important,
      dueDate,
      completed: task?.completed ?? false,
      completedAt: task?.completedAt ?? null,
    });
  }

  const q = urgent && important ? 1 : !urgent && important ? 2 : urgent && !important ? 3 : 4;

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
          />

          <Text style={mStyles.label}>
            Notes <Text style={mStyles.optional}>(optional)</Text>
          </Text>
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
                <Text
                  style={[
                    mStyles.priorityChipText,
                    { color: priority === p ? '#fff' : PRIORITY_COLORS[p] },
                  ]}
                >
                  {PRIORITY_LABELS[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={mStyles.label}>Eisenhower Matrix</Text>
          <View style={mStyles.toggleRow}>
            <View style={mStyles.toggleItem}>
              <Text style={mStyles.toggleLabel}>🔴 Urgent</Text>
              <Switch
                value={urgent}
                onValueChange={setUrgent}
                trackColor={{ false: COLORS.border, true: '#EF4444' }}
                thumbColor="#fff"
              />
            </View>
            <View style={mStyles.toggleItem}>
              <Text style={mStyles.toggleLabel}>⭐ Important</Text>
              <Switch
                value={important}
                onValueChange={setImportant}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
          {(urgent || important) && (
            <View style={[mStyles.qHint, { backgroundColor: QUADRANT_INFO[q].bg }]}>
              <Text style={[mStyles.qHintText, { color: QUADRANT_INFO[q].border }]}>
                {QUADRANT_INFO[q].icon} {QUADRANT_INFO[q].sub} — {QUADRANT_INFO[q].label}
              </Text>
            </View>
          )}

          <Text style={mStyles.label}>Due Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: SPACING.md }}
          >
            {DATE_CHIPS.map(chip => (
              <TouchableOpacity
                key={chip.label}
                onPress={() => setDueDate(chip.value)}
                style={[mStyles.dateChip, dueDate === chip.value && mStyles.dateChipActive]}
              >
                <Text
                  style={[mStyles.dateChipText, dueDate === chip.value && mStyles.dateChipTextActive]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

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
  container: { flex: 1, backgroundColor: '#FAFAFA' },
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  viewToggle: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  viewToggleActive: { backgroundColor: COLORS.primaryLight },
  addBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: '#fff',
  },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#F3F4F6',
  },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.xl },
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
  taskRowCompact: {
    padding: SPACING.sm,
    marginBottom: 4,
    borderRadius: 10,
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  checkbox: { marginRight: SPACING.sm, paddingTop: 1 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.sm, marginTop: 7 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, lineHeight: 20 },
  taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  taskNotes: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  dueDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, fontWeight: '500' },
  dueDateOverdue: { color: COLORS.danger },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 5 },
  tag: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, backgroundColor: '#FEE2E2',
  },
  tagImportant: { backgroundColor: COLORS.primaryLight },
  tagText: { fontSize: 10, fontWeight: '700', color: '#EF4444' },
  taskActions: { flexDirection: 'row', gap: 2, paddingTop: 2 },
  iconBtn: { padding: 6 },

  // Matrix
  matrixContainer: { padding: SPACING.md, paddingBottom: SPACING.xl },
  matrixHint: {
    fontSize: 12, color: COLORS.textSecondary, fontWeight: '600',
    textAlign: 'center', marginBottom: SPACING.md,
  },
  matrixGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  quadrant: {
    width: '48%',
    borderRadius: 18, borderWidth: 1.5,
    padding: SPACING.md, minHeight: 180,
  },
  quadrantHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: SPACING.sm },
  quadrantIcon: { fontSize: 22 },
  quadrantHeaderText: { flex: 1 },
  quadrantSub: { fontSize: 13, fontWeight: '800' },
  quadrantLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', marginTop: 1 },
  quadrantEmpty: { fontSize: 11, color: COLORS.textLight, textAlign: 'center', marginTop: 12 },
  matrixTask: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 6, marginBottom: 6,
  },
  matrixTaskText: { fontSize: 12, fontWeight: '600', color: COLORS.text, flex: 1, lineHeight: 16 },

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
  toggleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  toggleItem: {
    flex: 1, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: '#F8F8F8',
    borderRadius: 14, padding: SPACING.md,
  },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  qHint: { borderRadius: 12, padding: SPACING.sm, marginBottom: SPACING.md },
  qHintText: { fontSize: 13, fontWeight: '700' },
  dateChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F5F5F5', marginRight: 8,
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
