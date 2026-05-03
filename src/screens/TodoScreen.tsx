import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

type ViewMode = 'list' | 'calendar' | 'matrix';

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High', medium: 'Med', low: 'Low', none: 'None',
};

const QUADRANT_INFO = {
  1: { label: 'Do First', sub: 'Urgent & Important', bg: '#FEE2E2', border: '#EF4444', emoji: '🔥' },
  2: { label: 'Schedule', sub: 'Important, Not Urgent', bg: '#FEF3C7', border: '#F59E0B', emoji: '📅' },
  3: { label: 'Delegate', sub: 'Urgent, Not Important', bg: '#DBEAFE', border: '#3B82F6', emoji: '📤' },
  4: { label: 'Eliminate', sub: 'Not Urgent or Important', bg: '#D1FAE5', border: '#10B981', emoji: '🗑️' },
} as const;

function getQuadrant(task: Task): 1 | 2 | 3 | 4 {
  if (task.urgent && task.important) return 1;
  if (!task.urgent && task.important) return 2;
  if (task.urgent && !task.important) return 3;
  return 4;
}

// ── Calendar helpers ──────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}
function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function TodoScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calSelected, setCalSelected] = useState<string | null>(getTodayKey());

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
      const newTask: Task = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() };
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

  async function handleDelete(id: string) {
    const updated = tasks.filter(t => t.id !== id);
    await saveTasks(updated);
    setTasks(updated);
    setDeletingId(null);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setModalVisible(true);
  }

  function openAdd() {
    setEditingTask(null);
    setModalVisible(true);
  }

  // ── Computed ────────────────────────────────────────────────────────────────
  const active = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);
  const overdue = active.filter(t => t.dueDate && t.dueDate < today);
  const todayTasks = active.filter(t => t.dueDate === today);
  const upcoming = active.filter(t => t.dueDate && t.dueDate > today);
  const someday = active.filter(t => !t.dueDate);

  // ── Task row ────────────────────────────────────────────────────────────────
  function renderTaskRow(task: Task, accent?: string) {
    const isOverdue = !task.completed && task.dueDate && task.dueDate < today;
    const priorityColor = PRIORITY_COLORS[task.priority];
    const isDeleting = deletingId === task.id;

    return (
      <View key={task.id} style={[styles.taskRow, isDeleting && styles.taskRowDeleting]}>
        <TouchableOpacity onPress={() => handleToggleComplete(task)} style={styles.checkbox}>
          <View style={[styles.checkCircle, task.completed && { backgroundColor: COLORS.success, borderColor: COLORS.success }]}>
            {task.completed && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </TouchableOpacity>

        {accent ? <View style={[styles.accentDot, { backgroundColor: accent }]} /> : (
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
        )}

        <TouchableOpacity style={styles.taskInfo} onPress={() => openEdit(task)} activeOpacity={0.7}>
          <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]} numberOfLines={2}>
            {task.title}
          </Text>
          {task.notes ? <Text style={styles.taskNotes} numberOfLines={1}>{task.notes}</Text> : null}
          <View style={styles.taskMeta}>
            {task.dueDate ? (
              <Text style={[styles.metaTag, { color: isOverdue ? COLORS.danger : COLORS.textSecondary }]}>
                {isOverdue ? '⚠️' : '📅'} {task.dueDate}
              </Text>
            ) : null}
            {task.priority !== 'none' ? (
              <View style={[styles.priorityPill, { borderColor: priorityColor, backgroundColor: priorityColor + '18' }]}>
                <Text style={[styles.priorityPillText, { color: priorityColor }]}>
                  {PRIORITY_LABELS[task.priority]}
                </Text>
              </View>
            ) : null}
            {task.urgent ? <Text style={styles.metaChip}>🔴 Urgent</Text> : null}
            {task.important ? <Text style={styles.metaChip}>⭐ Important</Text> : null}
          </View>
        </TouchableOpacity>

        <View style={styles.rowActions}>
          {isDeleting ? (
            <>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={() => handleDelete(task.id)}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelDeleteBtn} onPress={() => setDeletingId(null)}>
                <Text style={styles.cancelDeleteText}>✕</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeletingId(task.id)}>
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────
  function renderListView() {
    if (active.length === 0) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🗒️</Text>
          <Text style={styles.emptyTitle}>No active tasks</Text>
          <Text style={styles.emptySubtext}>Tap "+ Add Task" to get started</Text>
        </View>
      );
    }
    return (
      <>
        {overdue.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionBar, { backgroundColor: COLORS.danger }]}>
              <Text style={styles.sectionBarText}>⚠️ Overdue · {overdue.length}</Text>
            </View>
            {overdue.map(t => renderTaskRow(t, COLORS.danger))}
          </View>
        )}
        {todayTasks.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionBar, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.sectionBarText}>🎯 Today · {todayTasks.length}</Text>
            </View>
            {todayTasks.map(t => renderTaskRow(t, COLORS.primary))}
          </View>
        )}
        {upcoming.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionBar, { backgroundColor: '#8B5CF6' }]}>
              <Text style={styles.sectionBarText}>📅 Upcoming · {upcoming.length}</Text>
            </View>
            {upcoming.map(t => renderTaskRow(t, '#8B5CF6'))}
          </View>
        )}
        {someday.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionBar, { backgroundColor: COLORS.textSecondary }]}>
              <Text style={styles.sectionBarText}>💭 Someday · {someday.length}</Text>
            </View>
            {someday.map(t => renderTaskRow(t))}
          </View>
        )}
        {done.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionBar, { backgroundColor: COLORS.success }]}>
              <Text style={styles.sectionBarText}>✅ Done · {done.length}</Text>
            </View>
            {done.map(t => renderTaskRow(t))}
          </View>
        )}
      </>
    );
  }

  // ── Calendar view ───────────────────────────────────────────────────────────
  function renderCalendarView() {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfWeek(calYear, calMonth);
    const monthName = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const tasksByDate: Record<string, Task[]> = {};
    tasks.forEach(t => {
      if (t.dueDate) {
        if (!tasksByDate[t.dueDate]) tasksByDate[t.dueDate] = [];
        tasksByDate[t.dueDate].push(t);
      }
    });

    const calDayTasks = calSelected ? (tasksByDate[calSelected] || []) : [];

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <View style={{ flex: 1 }}>
        {/* Month nav */}
        <View style={styles.calNav}>
          <TouchableOpacity onPress={() => {
            if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
            else setCalMonth(m => m - 1);
          }} style={styles.calNavBtn}>
            <Text style={styles.calNavArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.calNavTitle}>{monthName}</Text>
          <TouchableOpacity onPress={() => {
            if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
            else setCalMonth(m => m + 1);
          }} style={styles.calNavBtn}>
            <Text style={styles.calNavArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={styles.calDayHeaders}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <Text key={d} style={styles.calDayHeader}>{d}</Text>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.calGrid}>
          {cells.map((day, i) => {
            if (!day) return <View key={`e${i}`} style={styles.calCell} />;
            const dk = dateKey(calYear, calMonth, day);
            const dayTasks = tasksByDate[dk] || [];
            const isToday = dk === today;
            const isSelected = dk === calSelected;
            const hasOverdue = dayTasks.some(t => !t.completed && dk < today);
            const hasActive = dayTasks.some(t => !t.completed);
            const hasDone = dayTasks.some(t => t.completed);
            return (
              <TouchableOpacity
                key={dk}
                style={[styles.calCell, isSelected && styles.calCellSelected, isToday && !isSelected && styles.calCellToday]}
                onPress={() => setCalSelected(dk)}
                activeOpacity={0.7}
              >
                <Text style={[styles.calDayNum, isSelected && styles.calDayNumSelected, isToday && !isSelected && styles.calDayNumToday]}>
                  {day}
                </Text>
                {dayTasks.length > 0 && (
                  <View style={styles.calDots}>
                    {hasOverdue && <View style={[styles.calDot, { backgroundColor: COLORS.danger }]} />}
                    {hasActive && !hasOverdue && <View style={[styles.calDot, { backgroundColor: COLORS.primary }]} />}
                    {hasDone && <View style={[styles.calDot, { backgroundColor: COLORS.success }]} />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Task list for selected day */}
        <View style={styles.calDaySection}>
          <Text style={styles.calDaySectionTitle}>
            {calSelected
              ? `${new Date(calSelected + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`
              : 'Select a day'}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {calDayTasks.length === 0 ? (
              <Text style={styles.calEmpty}>No tasks this day — tap "+ Add Task" to create one</Text>
            ) : (
              calDayTasks.map(t => renderTaskRow(t))
            )}
          </ScrollView>
        </View>
      </View>
    );
  }

  // ── Matrix view ─────────────────────────────────────────────────────────────
  function renderMatrixView() {
    const activeTasks = tasks.filter(t => !t.completed);
    return (
      <ScrollView contentContainerStyle={styles.matrixContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.matrixHint}>Tap a task to mark complete · Tap ✏️ to edit</Text>
        <View style={styles.matrixGrid}>
          {([1, 2, 3, 4] as const).map(q => {
            const info = QUADRANT_INFO[q];
            const qTasks = activeTasks.filter(t => getQuadrant(t) === q);
            return (
              <View key={q} style={[styles.quadrant, { backgroundColor: info.bg, borderColor: info.border }]}>
                <View style={styles.quadrantHeader}>
                  <Text style={styles.quadrantEmoji}>{info.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.quadrantLabel, { color: info.border }]}>{info.label}</Text>
                    <Text style={styles.quadrantSub}>{info.sub}</Text>
                  </View>
                </View>
                {qTasks.length === 0 ? (
                  <Text style={styles.quadrantEmpty}>No tasks</Text>
                ) : (
                  qTasks.slice(0, 6).map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.matrixTask}
                      onPress={() => handleToggleComplete(t)}
                      onLongPress={() => openEdit(t)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.matrixCheck, { borderColor: info.border }]} />
                      <Text style={styles.matrixTaskText} numberOfLines={2}>{t.title}</Text>
                      <TouchableOpacity onPress={() => setDeletingId(t.id)} style={{ padding: 2 }}>
                        <Text style={{ fontSize: 11 }}>✕</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
                {qTasks.length > 6 && (
                  <Text style={[styles.quadrantEmpty, { marginTop: 4 }]}>+{qTasks.length - 6} more</Text>
                )}
                {deletingId && qTasks.find(t => t.id === deletingId) && (
                  <View style={styles.matrixDeleteConfirm}>
                    <Text style={styles.matrixDeleteText}>Delete this task?</Text>
                    <TouchableOpacity style={styles.confirmDeleteBtn} onPress={() => handleDelete(deletingId)}>
                      <Text style={styles.confirmDeleteText}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDeletingId(null)}>
                      <Text style={[styles.cancelDeleteText, { marginLeft: 8 }]}>No</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSub}>{active.length} active · {done.length} done</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* View mode tabs */}
      <View style={styles.viewTabs}>
        {([
          { key: 'list', label: '📋 List' },
          { key: 'calendar', label: '📅 Calendar' },
          { key: 'matrix', label: '🎯 Matrix' },
        ] as { key: ViewMode; label: string }[]).map(v => (
          <TouchableOpacity
            key={v.key}
            style={[styles.viewTab, viewMode === v.key && styles.viewTabActive]}
            onPress={() => setViewMode(v.key)}
          >
            <Text style={[styles.viewTabText, viewMode === v.key && styles.viewTabTextActive]}>
              {v.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {viewMode === 'list' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {renderListView()}
        </ScrollView>
      )}
      {viewMode === 'calendar' && renderCalendarView()}
      {viewMode === 'matrix' && renderMatrixView()}

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

function AddTaskModal({ visible, task, onSave, onClose }: {
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
    { label: 'Next Week', value: dateOffset(7) },
    { label: 'Custom', value: 'custom' as string | null },
  ];

  useEffect(() => {
    if (task) {
      setTitle(task.title); setNotes(task.notes);
      setPriority(task.priority); setUrgent(task.urgent);
      setImportant(task.important); setDueDate(task.dueDate);
      setCustomDateInput(task.dueDate ?? '');
    } else {
      setTitle(''); setNotes(''); setPriority('none');
      setUrgent(false); setImportant(false); setDueDate(null); setCustomDateInput('');
    }
  }, [task, visible]);

  function handleSave() {
    if (!title.trim()) return;
    let finalDate = dueDate;
    if (dueDate === 'custom') {
      const trimmed = customDateInput.trim();
      finalDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
    }
    onSave({
      title: title.trim(), notes: notes.trim(), priority, urgent, important,
      dueDate: finalDate, completed: task?.completed ?? false, completedAt: task?.completedAt ?? null,
    });
  }

  const q = urgent && important ? 1 : !urgent && important ? 2 : urgent && !important ? 3 : 4;
  const showQuadrant = urgent || important;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={mStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={mStyles.sheet} contentContainerStyle={mStyles.sheetContent}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        >
          <View style={mStyles.handle} />
          <Text style={mStyles.title}>{task ? 'Edit Task' : 'New Task'}</Text>

          <TextInput
            style={mStyles.titleInput}
            value={title} onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor={COLORS.textLight}
            maxLength={120} autoFocus={!task}
          />

          <TextInput
            style={mStyles.notesInput}
            value={notes} onChangeText={setNotes}
            placeholder="Add notes... (optional)"
            placeholderTextColor={COLORS.textLight}
            multiline maxLength={300}
          />

          <Text style={mStyles.label}>Priority</Text>
          <View style={mStyles.chipRow}>
            {(['none', 'low', 'medium', 'high'] as TaskPriority[]).map(p => (
              <TouchableOpacity
                key={p} onPress={() => setPriority(p)}
                style={[mStyles.priorityChip, { borderColor: PRIORITY_COLORS[p] }, priority === p && { backgroundColor: PRIORITY_COLORS[p] }]}
              >
                <Text style={[mStyles.priorityChipText, { color: priority === p ? '#fff' : PRIORITY_COLORS[p] }]}>
                  {PRIORITY_LABELS[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={mStyles.label}>Eisenhower Matrix</Text>
          <View style={mStyles.toggleRow}>
            <View style={mStyles.toggleItem}>
              <Text style={mStyles.toggleLabel}>🔴 Urgent</Text>
              <Switch value={urgent} onValueChange={setUrgent}
                trackColor={{ false: COLORS.border, true: '#EF4444' }} thumbColor="#fff" />
            </View>
            <View style={mStyles.toggleItem}>
              <Text style={mStyles.toggleLabel}>⭐ Important</Text>
              <Switch value={important} onValueChange={setImportant}
                trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor="#fff" />
            </View>
          </View>
          {showQuadrant && (
            <View style={[mStyles.qHint, { backgroundColor: QUADRANT_INFO[q].bg }]}>
              <Text style={[mStyles.qHintText, { color: QUADRANT_INFO[q].border }]}>
                {QUADRANT_INFO[q].emoji} {QUADRANT_INFO[q].label} — {QUADRANT_INFO[q].sub}
              </Text>
            </View>
          )}

          <Text style={mStyles.label}>Due Date</Text>
          <View style={mStyles.dateChipRow}>
            {DATE_CHIPS.map(chip => (
              <TouchableOpacity
                key={chip.label} onPress={() => setDueDate(chip.value)}
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
              style={[mStyles.titleInput, { marginBottom: SPACING.md }]}
              value={customDateInput} onChangeText={setCustomDateInput}
              placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textLight}
              keyboardType="numbers-and-punctuation" maxLength={10}
            />
          )}

          <View style={mStyles.btnRow}>
            <TouchableOpacity style={mStyles.cancelBtn} onPress={onClose}>
              <Text style={mStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[mStyles.saveBtn, !title.trim() && { opacity: 0.5 }]} onPress={handleSave} disabled={!title.trim()}>
              <Text style={mStyles.saveText}>{task ? 'Save Changes' : 'Add Task'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 30, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, backgroundColor: COLORS.primary },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  viewTabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 6,
  },
  viewTab: {
    flex: 1, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  viewTabActive: { backgroundColor: COLORS.primary },
  viewTabText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  viewTabTextActive: { color: '#fff' },

  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: 100 },

  // List sections
  section: { marginBottom: SPACING.md },
  sectionBar: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
  },
  sectionBarText: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  // Task row
  taskRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 16,
    padding: SPACING.md, marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  taskRowDeleting: { borderWidth: 1.5, borderColor: COLORS.danger },
  checkbox: { marginRight: 10, paddingTop: 2 },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#DDD',
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 11, fontWeight: '800' },
  accentDot: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: 10 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10, marginTop: 6 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, lineHeight: 20 },
  taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  taskNotes: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  metaTag: { fontSize: 11, fontWeight: '600' },
  metaChip: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  priorityPill: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1,
  },
  priorityPillText: { fontSize: 10, fontWeight: '700' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 6 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 16 },
  confirmDeleteBtn: {
    backgroundColor: COLORS.danger, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  confirmDeleteText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cancelDeleteBtn: {
    backgroundColor: '#F3F4F6', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  cancelDeleteText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },

  // Calendar
  calNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: '#fff',
  },
  calNavBtn: { padding: 8 },
  calNavArrow: { fontSize: 28, color: COLORS.primary, fontWeight: '300', lineHeight: 32 },
  calNavTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  calDayHeaders: { flexDirection: 'row', paddingHorizontal: SPACING.sm, backgroundColor: '#fff' },
  calDayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, paddingBottom: 6 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.sm, backgroundColor: '#fff', paddingBottom: SPACING.sm },
  calCell: {
    width: `${100 / 7}%`, aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center', padding: 2,
  },
  calCellToday: {},
  calCellSelected: { backgroundColor: COLORS.primary, borderRadius: 100 },
  calDayNum: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  calDayNumToday: { color: COLORS.primary, fontWeight: '800' },
  calDayNumSelected: { color: '#fff', fontWeight: '800' },
  calDots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  calDot: { width: 4, height: 4, borderRadius: 2 },
  calDaySection: {
    flex: 1, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.md,
  },
  calDaySectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  calEmpty: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: SPACING.lg },

  // Matrix
  matrixContainer: { padding: SPACING.md, paddingBottom: 100 },
  matrixHint: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.md, fontWeight: '600' },
  matrixGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  quadrant: { width: '48%', borderRadius: 18, borderWidth: 1.5, padding: SPACING.md, minHeight: 160 },
  quadrantHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: SPACING.sm },
  quadrantEmoji: { fontSize: 20 },
  quadrantLabel: { fontSize: 13, fontWeight: '800' },
  quadrantSub: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', marginTop: 1 },
  quadrantEmpty: { fontSize: 11, color: COLORS.textLight, textAlign: 'center', marginTop: 8 },
  matrixTask: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  matrixCheck: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, marginTop: 1, flexShrink: 0 },
  matrixTaskText: { fontSize: 12, fontWeight: '600', color: COLORS.text, flex: 1, lineHeight: 16 },
  matrixDeleteConfirm: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: SPACING.sm, paddingTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)',
  },
  matrixDeleteText: { fontSize: 11, color: COLORS.danger, fontWeight: '600', flex: 1 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { maxHeight: '95%', backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: SPACING.lg, paddingBottom: 48 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: SPACING.md },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  titleInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    fontSize: 16, color: COLORS.text, marginBottom: SPACING.sm,
  },
  notesInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: 14, color: COLORS.text, marginBottom: SPACING.md,
    minHeight: 64, textAlignVertical: 'top',
  },
  label: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: SPACING.sm,
  },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  priorityChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  priorityChipText: { fontSize: 13, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  toggleItem: {
    flex: 1, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 14, padding: SPACING.md,
  },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  qHint: { borderRadius: 12, padding: SPACING.sm, marginBottom: SPACING.md },
  qHintText: { fontSize: 13, fontWeight: '700' },
  dateChipRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md, flexWrap: 'wrap' },
  dateChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5' },
  dateChipActive: { backgroundColor: COLORS.primary },
  dateChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  dateChipTextActive: { color: '#fff' },
  btnRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: {
    flex: 1, paddingVertical: 15, borderRadius: 16,
    alignItems: 'center', backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  saveBtn: { flex: 2, paddingVertical: 15, borderRadius: 16, alignItems: 'center', backgroundColor: COLORS.primary },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
