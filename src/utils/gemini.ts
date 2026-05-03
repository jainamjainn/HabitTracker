import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import { Habit, HabitLog, Task } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY ?? '';
const genAI = new GoogleGenerativeAI(API_KEY);

export interface AIAction {
  type: 'create_habit' | 'create_task' | 'edit_habit' | 'edit_task' | 'delete_habit' | 'delete_task';
  payload: any;
}

export interface ParsedResponse {
  text: string;
  actions: AIAction[];
}

function buildSystemPrompt(
  habits: Habit[],
  logs: HabitLog,
  tasks: Task[],
  userName: string
): string {
  const today = new Date().toISOString().split('T')[0];
  const completedToday = logs[today] ?? [];

  const habitSummary = habits.length === 0
    ? 'No habits yet.'
    : habits.map(h => {
        const done = completedToday.includes(h.id);
        return `- [ID:${h.id}] ${h.emoji} ${h.name} | goal: ${h.streakGoal}d | done today: ${done ? 'yes' : 'no'} | motivation: "${h.motivationText ?? 'none'}"`;
      }).join('\n');

  const activeTasks = tasks.filter(t => !t.completed);
  const taskSummary = activeTasks.length === 0
    ? 'No active tasks.'
    : activeTasks.map(t => `- [ID:${t.id}] ${t.title} | priority: ${t.priority}`).join('\n');

  return `You are a friendly AI assistant inside ${userName || 'the user'}'s personal habit tracker app.

USER: ${userName || 'the user'}
TODAY: ${today}

CURRENT HABITS (use the ID when editing or deleting):
${habitSummary}

ACTIVE TASKS (use the ID when editing or deleting):
${taskSummary}

You can help the user:
- Create, edit, or delete habits and tasks
- Give motivation and insights about their progress
- Answer questions about habits and productivity

--- ACTION RULES ---
Include the relevant ACTION block at the END of your response. One action per response.

CREATE HABIT (pick emoji + one of: #FF6B35 #8B5CF6 #3B82F6 #10B981 #F59E0B #EF4444 #EC4899 #14B8A6):
ACTION_CREATE_HABIT:{"name":"...","emoji":"...","color":"...","motivationText":"...","streakGoal":30}

CREATE TASK:
ACTION_CREATE_TASK:{"title":"...","priority":"high|medium|low|none"}

EDIT HABIT (use exact ID from the list above):
ACTION_EDIT_HABIT:{"id":"...","name":"...","emoji":"...","color":"...","motivationText":"...","streakGoal":30}

EDIT TASK (use exact ID from the list above, only include fields that change):
ACTION_EDIT_TASK:{"id":"...","title":"...","priority":"high|medium|low|none"}

DELETE HABIT (use exact ID):
ACTION_DELETE_HABIT:{"id":"...","name":"..."}

DELETE TASK (use exact ID):
ACTION_DELETE_TASK:{"id":"...","title":"..."}

Keep responses warm, brief (2-4 sentences), and encouraging.`;
}

const ACTION_PATTERNS: Array<{ key: AIAction['type']; regex: RegExp }> = [
  { key: 'create_habit',  regex: /ACTION_CREATE_HABIT:(\{[\s\S]*?\})/ },
  { key: 'create_task',   regex: /ACTION_CREATE_TASK:(\{[\s\S]*?\})/ },
  { key: 'edit_habit',    regex: /ACTION_EDIT_HABIT:(\{[\s\S]*?\})/ },
  { key: 'edit_task',     regex: /ACTION_EDIT_TASK:(\{[\s\S]*?\})/ },
  { key: 'delete_habit',  regex: /ACTION_DELETE_HABIT:(\{[\s\S]*?\})/ },
  { key: 'delete_task',   regex: /ACTION_DELETE_TASK:(\{[\s\S]*?\})/ },
];

export function parseAIResponse(raw: string): ParsedResponse {
  const actions: AIAction[] = [];
  let text = raw;

  for (const { key, regex } of ACTION_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      try {
        const payload = JSON.parse(match[1]);
        actions.push({ type: key, payload });
      } catch {}
      text = text.replace(regex, '').trim();
    }
  }

  return { text, actions };
}

let chatSession: ChatSession | null = null;
let lastSystemPrompt = '';

export function startOrGetChat(
  habits: Habit[],
  logs: HabitLog,
  tasks: Task[],
  userName: string
): ChatSession {
  const systemPrompt = buildSystemPrompt(habits, logs, tasks, userName);

  if (!chatSession || lastSystemPrompt !== systemPrompt) {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });
    chatSession = model.startChat({ history: [] });
    lastSystemPrompt = systemPrompt;
  }

  return chatSession;
}

export function resetChat() {
  chatSession = null;
  lastSystemPrompt = '';
}
