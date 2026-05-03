import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Habit, HabitLog, Task, UserProfile } from '../types';

export interface CloudUserData {
  profile: UserProfile;
  habits: Habit[];
  logs: HabitLog;
  tasks: Task[];
  onboarded?: boolean;
}

function userDocId(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export async function fetchUserByEmail(email: string): Promise<CloudUserData | null> {
  try {
    const ref = doc(db, 'users', userDocId(email));
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as CloudUserData;
  } catch {
    return null;
  }
}

export async function saveUserToCloud(email: string, data: Partial<CloudUserData>): Promise<void> {
  try {
    const ref = doc(db, 'users', userDocId(email));
    await setDoc(ref, data, { merge: true });
  } catch (err) {
    console.warn('[CloudStorage] saveUserToCloud failed:', err);
  }
}
