import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import { Habit, HabitLog, Task } from '../types';
import { COLORS } from '../theme';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY ?? '';
const genAI = new GoogleGenerativeAI(API_KEY);

export interface AIAction {
  type: 'create_habit' | 'create_task' | 'delete_habit' | 'complete_habit';
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
        return `- ${h.emoji} ${h.name} (streak goal: ${h.streakGoal}d, done today: ${done ? 'yes' : 'no'})`;
      }).join('\n');

  const taskSummary = tasks.filter(t => !t.completed).length === 0
    ? 'No active tasks.'
    : tasks.filter(t => !t.completed).map(t => `- ${t.title} [${t.priority}]`).join('\n');

  return `You are a friendly AI assistant inside ${userName || 'the user'}'s personal habit tracker app.

USER: ${userName || 'the user'}
TODAY: ${today}

CURRENT HABITS:
${habitSummary}

ACTIVE TASKS:
${taskSummary}

You help the user:
- Create new habits or tasks
- Give motivation and insights about their progress
- Answer questions about habits and productivity
- Edit or manage their habits

When the user asks you to CREATE A HABIT, include this EXACT block at the end of your response (pick a relevant emoji and one of these colors: #FF6B35 #8B5CF6 #3B82F6 #10B981 #F59E0B #EF4444 #EC4899 #14B8A6):
ACTION_CREATE_HABIT:{"name":"...","emoji":"...","color":"...","motivationText":"...","streakGoal":30}

When the user asks you to CREATE A TASK, include this EXACT block at the end of your response:
ACTION_CREATE_TASK:{"title":"...","priority":"high|medium|low|none"}

Keep responses warm, brief (2-4 sentences max), and encouraging. You know the user personally.`;
}

export function parseAIResponse(raw: string): ParsedResponse {
  const actions: AIAction[] = [];
  let text = raw;

  const habitMatch = raw.match(/ACTION_CREATE_HABIT:(\{[^}]+\})/);
  if (habitMatch) {
    try {
      const payload = JSON.parse(habitMatch[1]);
      actions.push({ type: 'create_habit', payload });
    } catch {}
    text = text.replace(/ACTION_CREATE_HABIT:\{[^}]+\}/, '').trim();
  }

  const taskMatch = raw.match(/ACTION_CREATE_TASK:(\{[^}]+\})/);
  if (taskMatch) {
    try {
      const payload = JSON.parse(taskMatch[1]);
      actions.push({ type: 'create_task', payload });
    } catch {}
    text = text.replace(/ACTION_CREATE_TASK:\{[^}]+\}/, '').trim();
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

  // Restart chat if context changed significantly
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
