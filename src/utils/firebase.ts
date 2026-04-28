import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCEwLW0DzCF7oR4Wyi1N2svOzikNnXqIhA",
  authDomain: "habit-tracker-77ac0.firebaseapp.com",
  projectId: "habit-tracker-77ac0",
  storageBucket: "habit-tracker-77ac0.firebasestorage.app",
  messagingSenderId: "236338260275",
  appId: "1:236338260275:web:0460a1fd1e537160027646",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
