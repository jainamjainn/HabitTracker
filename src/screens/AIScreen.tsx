import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Habit, HabitLog, Task } from '../types';
import { getHabits, getLogs, getTasks, saveTasks, saveHabits, getUserProfile } from '../utils/storage';
import { startOrGetChat, parseAIResponse, resetChat, AIAction } from '../utils/gemini';
import { COLORS, SPACING } from '../theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions?: AIAction[];
  executed?: boolean;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  text: "Hey! I'm your AI assistant 👋 I can help you create habits, add tasks, edit or delete things, or chat about your progress. Tap 🎤 to talk to me!",
};

const isWeb = Platform.OS === 'web';

// ── Voice helpers (web only) ──────────────────────────────────────────────────
function getSpeechRecognition(): any {
  if (!isWeb) return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function speak(text: string) {
  if (!isWeb || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/ACTION_\w+:\{[^}]+\}/g, '').trim();
  const utt = new SpeechSynthesisUtterance(clean);
  utt.rate = 1.05;
  utt.pitch = 1;
  // Prefer a natural English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.startsWith('en') && v.localService);
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  if (isWeb && window.speechSynthesis) window.speechSynthesis.cancel();
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AIScreen() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userName, setUserName] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const recognitionRef = useRef<any>(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [h, l, t, p] = await Promise.all([getHabits(), getLogs(), getTasks(), getUserProfile()]);
        setHabits(h);
        setLogs(l);
        setTasks(t);
        setUserName(p?.name ?? '');
      }
      load();
      return () => {
        stopListening();
        stopSpeaking();
      };
    }, [])
  );

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // ── Voice input ─────────────────────────────────────────────────────────────
  function startListening() {
    const SR = getSpeechRecognition();
    if (!SR) {
      Alert.alert('Not supported', 'Voice input needs Chrome or Safari. Try those browsers.');
      return;
    }
    stopSpeaking();
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setListening(false);
      sendText(transcript);
    };

    recognitionRef.current = rec;
    rec.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  function handleMicPress() {
    if (listening) { stopListening(); return; }
    startListening();
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    await sendText(text);
  }

  async function sendText(text: string) {
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const chat = startOrGetChat(habits, logs, tasks, userName);
      const result = await chat.sendMessage(text);
      const raw = result.response.text();
      const { text: aiText, actions } = parseAIResponse(raw);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: aiText,
        actions: actions.length > 0 ? actions : undefined,
      };
      setMessages(prev => [...prev, aiMsg]);

      if (ttsEnabled) speak(aiText);
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "Sorry, I couldn't connect right now. Check your internet and try again.",
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  // ── Execute action ────────────────────────────────────────────────────────────
  async function executeAction(msgId: string, action: AIAction) {
    try {
      const p = action.payload;

      if (action.type === 'create_habit') {
        const newHabit: Habit = {
          id: Date.now().toString(),
          name: p.name ?? 'New Habit',
          emoji: p.emoji ?? '💪',
          color: p.color ?? COLORS.primary,
          motivationText: p.motivationText ?? null,
          habitType: 'build',
          timeRange: 'anytime',
          reminderTime: null,
          reminderDays: [],
          notificationIds: [],
          streakGoal: p.streakGoal ?? 30,
          createdAt: new Date().toISOString(),
        };
        const updated = [...habits, newHabit];
        await saveHabits(updated);
        setHabits(updated);
        Alert.alert('✅ Habit created!', `"${newHabit.emoji} ${newHabit.name}" added to your habits.`);
      }

      if (action.type === 'create_task') {
        const newTask: Task = {
          id: Date.now().toString(),
          title: p.title ?? 'New Task',
          notes: '',
          priority: p.priority ?? 'none',
          urgent: false,
          important: false,
          dueDate: null,
          completed: false,
          completedAt: null,
          createdAt: new Date().toISOString(),
        };
        const updated = [newTask, ...tasks];
        await saveTasks(updated);
        setTasks(updated);
        Alert.alert('✅ Task added!', `"${newTask.title}" added to your tasks.`);
      }

      if (action.type === 'edit_habit') {
        const updated = habits.map(h => h.id === p.id ? { ...h, ...p } : h);
        await saveHabits(updated);
        setHabits(updated);
        Alert.alert('✅ Habit updated!', `"${p.name ?? 'Habit'}" has been updated.`);
      }

      if (action.type === 'edit_task') {
        const updated = tasks.map(t => t.id === p.id ? { ...t, ...p } : t);
        await saveTasks(updated);
        setTasks(updated);
        Alert.alert('✅ Task updated!', `"${p.title ?? 'Task'}" has been updated.`);
      }

      if (action.type === 'delete_habit') {
        const updated = habits.filter(h => h.id !== p.id);
        await saveHabits(updated);
        setHabits(updated);
        Alert.alert('🗑️ Habit deleted', `"${p.name ?? 'Habit'}" removed.`);
      }

      if (action.type === 'delete_task') {
        const updated = tasks.filter(t => t.id !== p.id);
        await saveTasks(updated);
        setTasks(updated);
        Alert.alert('🗑️ Task deleted', `"${p.title ?? 'Task'}" removed.`);
      }

      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, executed: true } : m));
    } catch {
      Alert.alert('Error', 'Could not complete that action. Try again.');
    }
  }

  function handleClearChat() {
    stopSpeaking();
    resetChat();
    setMessages([WELCOME]);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiAvatar}><Text style={styles.aiAvatarEmoji}>🤖</Text></View>
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerSub}>Powered by Gemini</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {isWeb && (
            <TouchableOpacity
              style={[styles.headerBtn, ttsEnabled && styles.headerBtnActive]}
              onPress={() => { setTtsEnabled(v => !v); stopSpeaking(); }}
            >
              <Text style={styles.headerBtnText}>{ttsEnabled ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearChat}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map(msg => (
            <View key={msg.id}>
              <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                {msg.role === 'assistant' && (
                  <View style={styles.smallAvatar}><Text style={{ fontSize: 14 }}>🤖</Text></View>
                )}
                <View style={[styles.bubbleInner, msg.role === 'user' ? styles.userBubbleInner : styles.aiBubbleInner]}>
                  <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userBubbleText : styles.aiBubbleText]}>
                    {msg.text}
                  </Text>
                </View>
              </View>

              {msg.actions && msg.actions.length > 0 && !msg.executed && (
                <View style={styles.actionCards}>
                  {msg.actions.map((action, i) => {
                    const meta: Record<AIAction['type'], { emoji: string; label: string; name: string; tap: string }> = {
                      create_habit: { emoji: '💪', label: 'Create Habit',  name: `${action.payload.emoji ?? ''} ${action.payload.name ?? ''}`,  tap: 'Tap to add →' },
                      create_task:  { emoji: '✅', label: 'Add Task',      name: action.payload.title ?? '',                                       tap: 'Tap to add →' },
                      edit_habit:   { emoji: '✏️', label: 'Edit Habit',    name: action.payload.name ?? '',                                        tap: 'Tap to save →' },
                      edit_task:    { emoji: '✏️', label: 'Edit Task',     name: action.payload.title ?? '',                                       tap: 'Tap to save →' },
                      delete_habit: { emoji: '🗑️', label: 'Delete Habit',  name: action.payload.name ?? '',                                        tap: 'Tap to delete →' },
                      delete_task:  { emoji: '🗑️', label: 'Delete Task',   name: action.payload.title ?? '',                                       tap: 'Tap to delete →' },
                    };
                    const m = meta[action.type];
                    const isDelete = action.type.startsWith('delete');
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.actionCard, isDelete && styles.actionCardDanger]}
                        onPress={() => executeAction(msg.id, action)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionCardEmoji}>{m.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.actionCardLabel, isDelete && { color: COLORS.danger }]}>{m.label}</Text>
                          <Text style={styles.actionCardName}>{m.name}</Text>
                        </View>
                        <Text style={[styles.actionCardTap, isDelete && { color: COLORS.danger }]}>{m.tap}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {msg.actions && msg.executed && (
                <View style={styles.executedBadge}>
                  <Text style={styles.executedText}>✓ Done</Text>
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View style={[styles.bubble, styles.aiBubble]}>
              <View style={styles.smallAvatar}><Text style={{ fontSize: 14 }}>🤖</Text></View>
              <View style={[styles.bubbleInner, styles.aiBubbleInner, { paddingVertical: 14 }]}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick prompts — only on first message */}
        {messages.length === 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickRow}
            contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 8 }}
          >
            {[
              'How am I doing?',
              'Add a morning run habit',
              'Create a task to meal prep',
              'What habit should I add?',
              'Motivate me!',
            ].map(q => (
              <TouchableOpacity key={q} style={styles.quickChip} onPress={() => sendText(q)}>
                <Text style={styles.quickChipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          {/* Mic button */}
          {isWeb && (
            <TouchableOpacity
              style={[styles.micBtn, listening && styles.micBtnActive]}
              onPress={handleMicPress}
              activeOpacity={0.8}
            >
              <Text style={styles.micBtnText}>{listening ? '⏹' : '🎤'}</Text>
            </TouchableOpacity>
          )}

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={listening ? 'Listening...' : 'Ask me anything...'}
            placeholderTextColor={listening ? COLORS.danger : COLORS.textLight}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={send}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>

        {listening && (
          <View style={styles.listeningBar}>
            <View style={styles.listeningDot} />
            <Text style={styles.listeningText}>Listening — speak now...</Text>
            <TouchableOpacity onPress={stopListening}>
              <Text style={styles.listeningCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  aiAvatarEmoji: { fontSize: 22 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  headerBtnActive: { backgroundColor: COLORS.primaryLight },
  headerBtnText: { fontSize: 18 },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F3F4F6' },
  clearBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },

  messages: { flex: 1 },
  messagesContent: { padding: SPACING.md, paddingBottom: SPACING.lg },

  bubble: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  smallAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bubbleInner: { maxWidth: '80%', borderRadius: 18, padding: 12 },
  userBubbleInner: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  aiBubbleInner: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userBubbleText: { color: '#fff', fontWeight: '500' },
  aiBubbleText: { color: COLORS.text, fontWeight: '500' },

  actionCards: { marginLeft: 36, marginBottom: 8, gap: 8 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
  },
  actionCardDanger: { borderColor: COLORS.danger, shadowColor: COLORS.danger },
  actionCardEmoji: { fontSize: 24 },
  actionCardLabel: { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  actionCardName: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 1 },
  actionCardTap: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  executedBadge: { marginLeft: 36, marginBottom: 8 },
  executedText: { fontSize: 12, fontWeight: '600', color: COLORS.success },

  quickRow: { maxHeight: 44, marginBottom: SPACING.sm },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border,
  },
  quickChipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    paddingBottom: Platform.OS === 'web' ? SPACING.md : SPACING.sm,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  micBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: '#FEE2E2' },
  micBtnText: { fontSize: 20 },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: COLORS.background, borderRadius: 22,
    paddingHorizontal: SPACING.md, paddingVertical: 11,
    fontSize: 15, color: COLORS.text,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendBtnText: { fontSize: 20, color: '#fff', fontWeight: '800', lineHeight: 24 },

  listeningBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
    backgroundColor: '#FEF2F2', borderTopWidth: 1, borderTopColor: '#FECACA',
  },
  listeningDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.danger,
  },
  listeningText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.danger },
  listeningCancel: { fontSize: 13, fontWeight: '700', color: COLORS.danger },
});
