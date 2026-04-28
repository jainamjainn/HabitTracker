import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { COLORS, SPACING } from '../theme';

type AuthMode = 'signup' | 'login';

function getAuthError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'No account found — check email or sign up';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/email-already-in-use':
      return 'Account already exists — log in instead';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/invalid-email':
      return 'Enter a valid email address';
    case 'auth/too-many-requests':
      return 'Too many attempts — try again later';
    default:
      return 'Something went wrong. Try again';
  }
}

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function switchMode(m: AuthMode) {
    setMode(m);
    setError('');
    setPassword('');
    setConfirm('');
  }

  async function handleSubmit() {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password;

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    if (trimmedPass.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (mode === 'signup' && trimmedPass !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPass);
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPass);
      }
      // App.tsx onAuthStateChanged handles state transition
    } catch (err: any) {
      setLoading(false);
      setError(getAuthError(err.code ?? ''));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.emoji}>✨</Text>
            <Text style={styles.title}>HabitTracker</Text>
            <Text style={styles.subtitle}>Build habits. Track progress. Stay consistent.</Text>
          </View>

          <View style={styles.card}>
            {/* Mode toggle */}
            <View style={styles.modeToggle}>
              {(['signup', 'login'] as AuthMode[]).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                  onPress={() => switchMode(m)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                    {m === 'signup' ? 'Sign Up' : 'Log In'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
              keyboardType="email-address"
              maxLength={100}
              returnKeyType="next"
              editable={!loading}
            />

            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Password (min 6 characters)"
                placeholderTextColor={COLORS.textLight}
                secureTextEntry={!showPassword}
                maxLength={64}
                returnKeyType={mode === 'signup' ? 'next' : 'done'}
                onSubmitEditing={mode === 'login' ? handleSubmit : undefined}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.showHideBtn}
                onPress={() => setShowPassword(v => !v)}
              >
                <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            {mode === 'signup' && (
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Confirm password"
                placeholderTextColor={COLORS.textLight}
                secureTextEntry={!showPassword}
                maxLength={64}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                editable={!loading}
              />
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>
                    {mode === 'signup' ? 'Create Account →' : 'Log In →'}
                  </Text>
              }
            </TouchableOpacity>

            <Text style={styles.note}>
              {mode === 'signup'
                ? 'Your data is saved to the cloud — log in on any device to restore it.'
                : 'Welcome back! Your habits and progress will be restored.'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  hero: { alignItems: 'center', marginBottom: SPACING.xl },
  emoji: { fontSize: 56, marginBottom: SPACING.sm },
  title: { fontSize: 36, fontWeight: '900', color: COLORS.text, letterSpacing: -1 },
  subtitle: {
    fontSize: 15, color: COLORS.textSecondary, fontWeight: '500',
    textAlign: 'center', marginTop: SPACING.sm, lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: SPACING.lg,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 20, elevation: 5,
  },
  modeToggle: {
    flexDirection: 'row', backgroundColor: '#F3F4F6',
    borderRadius: 16, padding: 4, marginBottom: SPACING.lg,
  },
  modeBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 13, alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  modeBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  modeBtnTextActive: { color: COLORS.text },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    paddingHorizontal: SPACING.md, paddingVertical: 15,
    fontSize: 16, color: COLORS.text, marginBottom: SPACING.md,
    backgroundColor: '#FAFAFA',
  },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    backgroundColor: '#FAFAFA', marginBottom: SPACING.md,
  },
  passwordInput: {
    flex: 1, paddingHorizontal: SPACING.md, paddingVertical: 15,
    fontSize: 16, color: COLORS.text,
  },
  showHideBtn: { paddingHorizontal: SPACING.md, paddingVertical: 15 },
  showHideText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  error: { color: COLORS.danger, fontSize: 13, fontWeight: '600', marginBottom: SPACING.sm },
  btn: {
    backgroundColor: COLORS.text, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', marginTop: SPACING.sm,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  note: {
    fontSize: 12, color: COLORS.textSecondary, textAlign: 'center',
    marginTop: SPACING.md, lineHeight: 18,
  },
});
