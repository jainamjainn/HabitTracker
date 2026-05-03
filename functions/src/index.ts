import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';

admin.initializeApp();

const ADMIN_EMAIL = 'jainamr4csea@gmail.com';

export const geminiChat = onCall({ cors: true }, async (request) => {
  const { message, systemPrompt, history = [] } = request.data as {
    message: string;
    systemPrompt: string;
    history: Content[];
  };

  if (!message || !systemPrompt) {
    throw new HttpsError('invalid-argument', 'message and systemPrompt required');
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new HttpsError('internal', 'Server misconfigured');
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    return { text: result.response.text() };
  } catch (err: any) {
    console.error('Gemini error:', err);
    throw new HttpsError('internal', err.message ?? 'Gemini call failed');
  }
});

export const adminData = onCall(async (request) => {
  if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
    throw new HttpsError('permission-denied', 'Admin only');
  }

  const snap = await admin.firestore().collection('users').get();

  const users = snap.docs.map(d => {
    const data = d.data();
    const tasks: any[] = data.tasks ?? [];
    const habits: any[] = data.habits ?? [];
    const logs: Record<string, string[]> = data.logs ?? {};

    const completedTasks = tasks.filter((t: any) => t.completed).length;
    const totalCheckins = Object.values(logs).reduce((sum, arr) => sum + arr.length, 0);
    const lastActive = Object.keys(logs).sort().pop() ?? null;

    return {
      id: d.id,
      name: data.profile?.name ?? 'Unknown',
      email: data.profile?.email ?? d.id,
      joinedAt: data.profile?.joinedAt ?? null,
      habitCount: habits.length,
      taskCount: tasks.length,
      completedTasks,
      totalCheckins,
      lastActive,
    };
  });

  return {
    users,
    total: users.length,
    generatedAt: new Date().toISOString(),
  };
});
