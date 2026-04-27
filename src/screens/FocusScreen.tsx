import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Vibration,
  AppState,
  AppStateStatus,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme';

type FocusMode = 'pomo' | 'stopwatch';

const POMO_OPTIONS = [15, 20, 25, 30, 45];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export default function FocusScreen() {
  const [mode, setMode] = useState<FocusMode>('pomo');
  const [pomoDuration, setPomoDuration] = useState(25);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sessions, setSessions] = useState(0);

  // Refs for timer accuracy
  const startAtRef = useRef<number | null>(null); // Date.now() when last started/resumed
  const baseSecondsRef = useRef<number>(25 * 60); // seconds at the point of last start/resume
  const runningRef = useRef(false);
  const modeRef = useRef<FocusMode>('pomo');
  runningRef.current = running;
  modeRef.current = mode;

  // Reset when switching mode or pomo duration
  useEffect(() => {
    if (running) return; // don't reset while running
    const base = mode === 'pomo' ? pomoDuration * 60 : 0;
    setSeconds(base);
    baseSecondsRef.current = base;
    setFinished(false);
  }, [mode, pomoDuration]);

  // Timer effect
  useEffect(() => {
    if (!running) return;
    startAtRef.current = Date.now();
    baseSecondsRef.current = seconds;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (startAtRef.current ?? Date.now())) / 1000);
      if (modeRef.current === 'pomo') {
        const remaining = baseSecondsRef.current - elapsed;
        if (remaining <= 0) {
          setSeconds(0);
          setRunning(false);
          setSessions(prev => prev + 1);
          setFinished(true);
          Vibration.vibrate([0, 500, 150, 500, 150, 500]);
        } else {
          setSeconds(remaining);
        }
      } else {
        setSeconds(baseSecondsRef.current + elapsed);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle app going to background (preserve timer accuracy)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' && runningRef.current) {
        // save current timestamp — timer keeps running based on wall clock
        startAtRef.current = Date.now();
      }
    });
    return () => sub.remove();
  }, []);

  function handleStartPause() {
    if (finished) {
      // Reset for another session
      const base = mode === 'pomo' ? pomoDuration * 60 : 0;
      setSeconds(base);
      baseSecondsRef.current = base;
      setFinished(false);
      return;
    }
    if (!running) {
      // Starting or resuming
      startAtRef.current = Date.now();
      baseSecondsRef.current = seconds;
    }
    setRunning(r => !r);
  }

  function handleReset() {
    setRunning(false);
    setFinished(false);
    const base = mode === 'pomo' ? pomoDuration * 60 : 0;
    setSeconds(base);
    baseSecondsRef.current = base;
  }

  function handleSwitchMode(newMode: FocusMode) {
    if (running) {
      Alert.alert('Timer is running', 'Stop the timer before switching modes.', [
        { text: 'Stop & Switch', style: 'destructive', onPress: () => { setRunning(false); setMode(newMode); } },
        { text: 'Keep Going', style: 'cancel' },
      ]);
      return;
    }
    setMode(newMode);
  }

  const pomoDurationSec = pomoDuration * 60;
  const progress = mode === 'pomo' ? 1 - seconds / pomoDurationSec : 0;
  const progressPct = Math.round(progress * 100);

  const ringColor = finished
    ? COLORS.success
    : running
    ? COLORS.primary
    : '#E5E7EB';

  const startLabel =
    finished
      ? 'Start New'
      : running
      ? 'Pause'
      : seconds === (mode === 'pomo' ? pomoDurationSec : 0) && !finished
      ? 'Start'
      : 'Resume';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header + mode toggle */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Focus</Text>
        <View style={styles.modeToggle}>
          {(['pomo', 'stopwatch'] as FocusMode[]).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => handleSwitchMode(m)}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'pomo' ? 'Pomo' : 'Stopwatch'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Duration picker — pomo only, only when not running */}
      {mode === 'pomo' && !running && !finished && (
        <View style={styles.durationRow}>
          {POMO_OPTIONS.map(d => (
            <TouchableOpacity
              key={d}
              onPress={() => setPomoDuration(d)}
              style={[styles.durationBtn, pomoDuration === d && styles.durationBtnActive]}
            >
              <Text style={[styles.durationText, pomoDuration === d && styles.durationTextActive]}>
                {d}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Timer ring */}
      <View style={styles.timerArea}>
        <View style={[styles.timerRing, { borderColor: ringColor }]}>
          {running && !finished && <View style={styles.ringingIndicator} />}
          <Text style={styles.timerText}>{formatTime(seconds)}</Text>
          <Text style={styles.timerSub}>
            {finished
              ? '🎉 Complete!'
              : mode === 'pomo'
              ? running
                ? 'Stay focused'
                : 'Ready to focus'
              : running
              ? 'Keep going...'
              : seconds > 0
              ? 'Paused'
              : 'Ready'}
          </Text>
        </View>

        {/* Progress bar (pomo only) */}
        {mode === 'pomo' && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.progressPct}>{progressPct}%</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
          <Ionicons name="refresh" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.startBtn,
            running && styles.pauseBtn,
            finished && styles.doneBtn,
          ]}
          onPress={handleStartPause}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>{startLabel}</Text>
        </TouchableOpacity>

        {/* Spacer to center the start button */}
        <View style={{ width: 52 }} />
      </View>

      {/* Session counter — pomo mode */}
      {mode === 'pomo' && (
        <View style={styles.sessionsArea}>
          <Text style={styles.sessionsTitle}>Sessions Today</Text>
          <View style={styles.dotsRow}>
            {Array.from({ length: Math.max(sessions > 0 ? sessions : 0, 4) }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < sessions && styles.dotFilled]}
              />
            ))}
          </View>
          {sessions > 0 ? (
            <Text style={styles.sessionCountText}>
              {sessions} session{sessions !== 1 ? 's' : ''} completed 🎉
            </Text>
          ) : (
            <Text style={styles.sessionHint}>Complete a session to see your count</Text>
          )}
        </View>
      )}

      {/* Stopwatch info */}
      {mode === 'stopwatch' && seconds > 0 && (
        <View style={styles.sessionsArea}>
          <Text style={styles.sessionsTitle}>Elapsed Time</Text>
          <Text style={styles.elapsedText}>
            {Math.floor(seconds / 3600) > 0 ? `${Math.floor(seconds / 3600)}h ` : ''}
            {Math.floor((seconds % 3600) / 60)}m {seconds % 60}s
          </Text>
          {seconds >= 1500 && (
            <Text style={styles.sessionHint}>💪 That's the focus of a full Pomo session!</Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  headerTitle: {
    fontSize: 30, fontWeight: '800', color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    padding: 4,
  },
  modeBtn: {
    paddingHorizontal: 26, paddingVertical: 9, borderRadius: 18,
  },
  modeBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  modeBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  modeBtnTextActive: { color: COLORS.text },

  durationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  durationBtn: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 20, backgroundColor: '#F3F4F6',
  },
  durationBtnActive: { backgroundColor: COLORS.primary },
  durationText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  durationTextActive: { color: '#fff' },

  timerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerRing: {
    width: 240, height: 240, borderRadius: 120,
    borderWidth: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  ringingIndicator: {
    position: 'absolute',
    width: 254, height: 254, borderRadius: 127,
    borderWidth: 2, borderColor: COLORS.primary,
    opacity: 0.3,
  },
  timerText: {
    fontSize: 50, fontWeight: '800', color: COLORS.text, letterSpacing: -1,
  },
  timerSub: {
    fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginTop: 8,
  },
  progressWrap: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginTop: SPACING.lg, width: 240,
  },
  progressTrack: {
    flex: 1, height: 6, backgroundColor: '#E5E7EB',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: COLORS.primary, borderRadius: 3,
  },
  progressPct: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, minWidth: 34, textAlign: 'right',
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  resetBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  startBtn: {
    flex: 1, height: 58, borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  pauseBtn: { backgroundColor: '#F59E0B' },
  doneBtn: { backgroundColor: COLORS.success },
  startBtnText: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

  sessionsArea: {
    alignItems: 'center',
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  sessionsTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.md,
  },
  dotsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#E5E7EB',
  },
  dotFilled: { backgroundColor: COLORS.primary },
  sessionCountText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  sessionHint: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  elapsedText: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
});
