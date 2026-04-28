import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform, AppState, Animated,
} from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList, ExerciseLog, SetLog, CompletedWorkout } from '../types';
import { getExerciseAlternatives } from '../services/aiService';
import { saveWorkout, loadHistory } from '../services/workoutHistoryService';
import {
  setupNotifications, scheduleRestEndNotification, cancelRestNotification,
  triggerRestEndAlert,
  setRestActionCallback, setRestPauseActionCallback,
  playCountdownBeep,
} from '../services/notificationService';
import { WorkoutSummaryCard } from '../components/WorkoutSummaryCard';
import { WorkoutStoryCard } from '../components/WorkoutStoryCard';
import { ExerciseHistoryModal } from '../components/ExerciseHistoryModal';
import * as MediaLibrary from 'expo-media-library';
import { analyzeWorkoutForPersonalRecords } from '../services/personalRecordsService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ActiveWorkout'>;
  route: RouteProp<RootStackParamList, 'ActiveWorkout'>;
};

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA', primaryGlow: 'rgba(124,58,237,0.15)',
  success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
  text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

const ACTIVE_WORKOUT_SESSION_KEY = '@gymapp_active_workout_session';
const SESSIONS_COUNTER_KEY = '@gymapp_sessions_counter';
const PERSIST_INTERVAL_SECONDS = 5;
const MIN_REST_SECONDS = 10;
const MAX_REST_SECONDS = 600;
function isValidRestDuration(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_REST_SECONDS && value <= MAX_REST_SECONDS;
}

function formatClock(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function buildLogs(workout: Props['route']['params']['workout']): ExerciseLog[] {
  return workout.exercises.map(ex => ({
    name: ex.name,
    targetSets: ex.sets,
    targetReps: ex.reps,
    rest: ex.rest,
    blockType: ex.blockType,
    sets: Array.from({ length: ex.sets }, (): SetLog => ({ load: '', reps: '', done: false })),
  }));
}

export function ActiveWorkoutScreen({ navigation, route }: Props) {
  const { workout, context } = route.params;
  const insets = useSafeAreaInsets();
  const shareRef = useRef<View>(null);
  const storyRef = useRef<View>(null);

  // ── Timer (background only – no visible timer/rest UI) ──
  const [elapsed, setElapsed] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restDuration, setRestDuration] = useState(90);

  // ── Exercises ──
  const [exercises, setExercises] = useState<ExerciseLog[]>(() => buildLogs(workout));

  // ── Substitution ──
  const [showAlts, setShowAlts] = useState(false);
  const [selectedExIdx, setSelectedExIdx] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [loadingAlts, setLoadingAlts] = useState(false);

  // ── HR input ──
  const [hrBpm, setHrBpm] = useState('');
  const [showHrModal, setShowHrModal] = useState(false);

  // ── Share / finish ──
  const [savedWorkout, setSavedWorkout] = useState<CompletedWorkout | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseSets, setNewExerciseSets] = useState('3');
  const [newExerciseReps, setNewExerciseReps] = useState('10-12');
  const [newExerciseRest, setNewExerciseRest] = useState('90s');
  const [newExBlockType, setNewExBlockType] = useState('Normal');
  const [newExName2, setNewExName2] = useState('');
  const [newExName3, setNewExName3] = useState('');
  const [newExName4, setNewExName4] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyExerciseName, setHistoryExerciseName] = useState('');
  const [workoutHistory, setWorkoutHistory] = useState<CompletedWorkout[]>([]);

  // ── Sessions celebration ──
  const [showCelebration, setShowCelebration] = useState(false);
  const [sessionsRemaining, setSessionsRemaining] = useState<number | null>(null);
  const celebrationScale = useRef(new Animated.Value(0)).current;

  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;
  const workoutStartAtRef = useRef<number | null>(null);
  const restEndsAtRef = useRef<number | null>(null);
  const restCompletionFiredRef = useRef(false);
  // Guard: prevents persistSession from overwriting AsyncStorage before the
  // restore effect has had a chance to read the saved session on mount.
  // Without this, the initial render's state (buildLogs) would be persisted and
  // overwrite the user's in-progress session before the restore reads it.
  const sessionLoadedRef = useRef(false);

  // Keep a stable ref so the notification callback always calls the latest startRest
  const startRestRef = useRef<() => void>(() => {});

  const clearPersistedSession = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ACTIVE_WORKOUT_SESSION_KEY);
    } catch {}
  }, []);

  const persistSession = useCallback(async () => {
    if (!sessionLoadedRef.current) return;
    try {
      await AsyncStorage.setItem(
        ACTIVE_WORKOUT_SESSION_KEY,
        JSON.stringify({
          workout,
          context,
          exercises,
          elapsed: elapsedRef.current,
          restActive,
          restRemaining,
          restDuration,
          workoutStartAt: workoutStartAtRef.current ?? Date.now(),
          restEndsAt: restEndsAtRef.current,
          savedAt: Date.now(),
        }),
      );
    } catch {}
  }, [workout, context, exercises, restActive, restRemaining, restDuration]);

  // Stopwatch based on start timestamp (keeps exact count after app background)
  useEffect(() => {
    if (!workoutStartAtRef.current) workoutStartAtRef.current = Date.now();
    const id = setInterval(() => {
      const startedAt = workoutStartAtRef.current ?? Date.now();
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Persist session periodically for crash/kill recovery
  useEffect(() => {
    if (elapsed === 0 || elapsed % PERSIST_INTERVAL_SECONDS !== 0) return;
    persistSession();
  }, [elapsed, persistSession]);

  useEffect(() => {
    persistSession();
  }, [exercises, restActive, restRemaining, restDuration, persistSession]);

  // Restore persisted in-progress session if available
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ACTIVE_WORKOUT_SESSION_KEY);
        if (!raw) { sessionLoadedRef.current = true; return; }
        const saved = JSON.parse(raw);
        if (!saved?.workout || !Array.isArray(saved?.exercises)) { sessionLoadedRef.current = true; return; }
        setExercises(saved.exercises);
        const workoutStartAt = typeof saved.workoutStartAt === 'number'
          ? saved.workoutStartAt
          : Date.now() - Math.max(0, Number(saved.elapsed) || 0) * 1000;
        workoutStartAtRef.current = workoutStartAt;
        setElapsed(Math.max(0, Math.floor((Date.now() - workoutStartAt) / 1000)));
        const savedRestDuration = Number(saved.restDuration);
        if (isValidRestDuration(savedRestDuration)) {
          setRestDuration(savedRestDuration);
        }
        const restEndsAt = typeof saved.restEndsAt === 'number' ? saved.restEndsAt : null;
        if (saved.restActive && restEndsAt && restEndsAt > Date.now()) {
          restEndsAtRef.current = restEndsAt;
          setRestActive(true);
          setRestRemaining(Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000)));
        }
      } catch {}
      sessionLoadedRef.current = true;
    })();
  }, []);

  // Keep persisted snapshot when app goes background and refresh timers when app returns
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const startedAt = workoutStartAtRef.current ?? Date.now();
        setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
        if (restEndsAtRef.current) {
          setRestRemaining(Math.max(0, Math.ceil((restEndsAtRef.current - Date.now()) / 1000)));
        }
        return;
      }
      persistSession();
    });
    return () => sub.remove();
  }, [persistSession]);

  // Load workout history for exercise history modal
  useEffect(() => {
    loadHistory().then(setWorkoutHistory).catch(() => {});
  }, []);

  // Rest countdown based on absolute end timestamp
  const countdownBeepFiredRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!restActive || !restEndsAtRef.current) {
      countdownBeepFiredRef.current = new Set();
      return;
    }
    const id = setInterval(async () => {
      if (!restEndsAtRef.current) return;
      const remaining = Math.max(0, Math.ceil((restEndsAtRef.current - Date.now()) / 1000));
      setRestRemaining(remaining);
      // Play countdown beeps at 3, 2, 1 seconds remaining
      if (remaining >= 1 && remaining <= 3 && !countdownBeepFiredRef.current.has(remaining)) {
        countdownBeepFiredRef.current.add(remaining);
        playCountdownBeep().catch(() => {});
      }
      if (remaining <= 0 && !restCompletionFiredRef.current) {
        restCompletionFiredRef.current = true;
        restEndsAtRef.current = null;
        setRestActive(false);
        await cancelRestNotification();
        await triggerRestEndAlert();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [restActive]);

  const startRest = useCallback((dur?: number) => {
    const d = dur ?? restDuration;
    restCompletionFiredRef.current = false;
    countdownBeepFiredRef.current = new Set();
    restEndsAtRef.current = Date.now() + d * 1000;
    setRestRemaining(d);
    setRestActive(true);
    scheduleRestEndNotification(d);
  }, [restDuration]);

  // Keep ref in sync and register notification callback
  startRestRef.current = startRest;
  useEffect(() => {
    setupNotifications();
    setRestActionCallback(() => startRestRef.current());
    setRestPauseActionCallback(() => stopRest());
    return () => {
      persistSession();
      setRestActionCallback(null);
      setRestPauseActionCallback(null);
    };
  }, [persistSession]);

  const stopRest = useCallback(() => {
    restCompletionFiredRef.current = false;
    restEndsAtRef.current = null;
    setRestActive(false);
    setRestRemaining(0);
    cancelRestNotification();
  }, []);

  const updateSet = useCallback((exIdx: number, setIdx: number, field: 'load' | 'reps', value: string) => {
    setExercises(prev => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      ex.sets[setIdx] = { ...ex.sets[setIdx], [field]: value };
      next[exIdx] = ex;
      return next;
    });
  }, []);

  const toggleSetDone = useCallback((exIdx: number, setIdx: number) => {
    setExercises(prev => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      const nowDone = !ex.sets[setIdx].done;
      ex.sets[setIdx] = { ...ex.sets[setIdx], done: nowDone };
      next[exIdx] = ex;
      if (nowDone) startRest();
      return next;
    });
  }, [startRest]);

  const addExtraSet = useCallback((exIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      ex.sets.push({ load: '', reps: '', done: false });
      ex.targetSets += 1;
      next[exIdx] = ex;
      return next;
    });
  }, []);

  const openAlternatives = useCallback(async (exIdx: number) => {
    setSelectedExIdx(exIdx);
    setAlternatives([]);
    setLoadingAlts(true);
    setShowAlts(true);
    try {
      const alts = await getExerciseAlternatives(
        exercises[exIdx].name, workout.focus, exercises.map(e => e.name),
      );
      setAlternatives(alts.length ? alts : ['Alternativa 1', 'Alternativa 2', 'Alternativa 3']);
    } catch {
      setAlternatives(['Alternativa 1', 'Alternativa 2', 'Alternativa 3']);
    } finally {
      setLoadingAlts(false);
    }
  }, [exercises, workout.focus]);

  const substituteExercise = useCallback((name: string) => {
    if (selectedExIdx === null) return;
    setExercises(prev => {
      const next = [...prev];
      next[selectedExIdx] = {
        ...next[selectedExIdx], name,
        sets: next[selectedExIdx].sets.map(s => ({ ...s, done: false })),
      };
      return next;
    });
    setShowAlts(false);
  }, [selectedExIdx]);

  const confirmExit = useCallback(() => {
    Alert.alert('Sair do treino', 'O progresso não será salvo. Deseja sair?', [
      { text: 'Continuar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => { await clearPersistedSession(); navigation.goBack(); } },
    ]);
  }, [navigation, clearPersistedSession]);

  const addManualExercise = useCallback(() => {
    const targetSets = parseInt(newExerciseSets, 10);
    if (!newExerciseName.trim() || Number.isNaN(targetSets) || targetSets < 1 || targetSets > 20 || !newExerciseReps.trim() || !newExerciseRest.trim()) {
      Alert.alert('Atenção', 'Preencha nome, séries, reps e descanso corretamente.');
      return;
    }
    const extraCount = newExBlockType === 'Biset' ? 1 : newExBlockType === 'Triset' ? 2 : newExBlockType === 'Superset' ? 3 : 0;
    const names = [newExerciseName.trim(), newExName2.trim(), newExName3.trim(), newExName4.trim()].slice(0, extraCount + 1);
    if (extraCount > 0 && names.some((n, i) => i > 0 && !n)) {
      Alert.alert('Atenção', 'Preencha os nomes de todos os exercícios do bloco.');
      return;
    }
    const total = names.length;
    const newLogs: ExerciseLog[] = names.map((n, i) => ({
      name: n,
      targetSets,
      targetReps: newExerciseReps.trim(),
      rest: total > 1 && i < total - 1 ? '0s' : newExerciseRest.trim(),
      blockType: newExBlockType !== 'Normal' ? newExBlockType : undefined,
      sets: Array.from({ length: targetSets }, () => ({ load: '', reps: '', done: false })),
    }));
    setExercises((prev) => [...prev, ...newLogs]);
    setNewExerciseName(''); setNewExName2(''); setNewExName3(''); setNewExName4('');
    setNewExerciseSets('3'); setNewExerciseReps('10-12'); setNewExerciseRest('90s');
    setNewExBlockType('Normal');
    setShowAddExercise(false);
  }, [newExerciseName, newExerciseSets, newExerciseReps, newExerciseRest, newExBlockType, newExName2, newExName3, newExName4]);

  const finishWorkout = useCallback(async () => {
    await clearPersistedSession();
    const log: CompletedWorkout = {
      id: String(Date.now()),
      date: new Date().toISOString(),
      dayOfWeek: workout.dayOfWeek,
      focus: workout.focus,
      durationSeconds: elapsedRef.current,
      exercises,
      ...context,
    };
    await saveWorkout(log);
    const prs = await analyzeWorkoutForPersonalRecords(log);
    setSavedWorkout(log);
    setShowShare(true);
    if (prs.length > 0) {
      const lines = prs.map((pr) => `🏆 ${pr.exerciseName}: ${pr.current.maxLoad.toFixed(0)}kg · ${pr.current.maxReps} reps`).join('\n');
      Alert.alert('Novo Recorde Pessoal!', lines);
    }

    // Sessions counter — only for plan workouts
    if (context !== undefined) {
      try {
        const raw = await AsyncStorage.getItem(SESSIONS_COUNTER_KEY);
        const current = raw !== null ? parseInt(raw, 10) : null;
        if (current !== null && !isNaN(current)) {
          const next = Math.max(0, current - 1);
          await AsyncStorage.setItem(SESSIONS_COUNTER_KEY, String(next));
          setSessionsRemaining(next);
          celebrationScale.setValue(0);
          Animated.spring(celebrationScale, {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
          }).start();
          setShowCelebration(true);
        }
      } catch (error) {
        console.error('Failed to update sessions counter:', error);
      }
    }
  }, [exercises, workout, context, clearPersistedSession, celebrationScale]);

  const confirmFinish = useCallback(() => {
    const done = exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
    const total = exercises.reduce((a, e) => a + e.sets.length, 0);
    Alert.alert(
      'Finalizar Treino',
      `${done}/${total} séries concluídas. Deseja salvar e finalizar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Finalizar', onPress: finishWorkout },
      ],
    );
  }, [exercises, finishWorkout]);

  const handleShare = useCallback(async () => {
    if (!shareRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(shareRef, { format: 'png', quality: 0.95 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar treino' });
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar. Tente novamente.');
    } finally {
      setSharing(false);
    }
  }, []);

  const handleShareStory = useCallback(async () => {
    if (!storyRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(storyRef, { format: 'png', quality: 0.95 });
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Salvo!', 'Story salvo na galeria. Abra o Instagram e cole nos Stories!', [{ text: 'OK' }]);
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar Story' });
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o story. Tente novamente.');
    } finally {
      setSharing(false);
    }
  }, []);

  const doneCount = exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0);
  const progress = totalSets > 0 ? doneCount / totalSets : 0;
  const avgHr = hrBpm ? parseInt(hrBpm, 10) : undefined;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={confirmExit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.exitBtn}>✕</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle} numberOfLines={1}>{workout.focus}</Text>
            <Text style={s.headerSub}>{workout.dayOfWeek}</Text>
          </View>
          {/* HR badge */}
          <TouchableOpacity style={s.hrBadge} onPress={() => setShowHrModal(true)}>
            <Text style={s.hrBadgeText}>❤️ {hrBpm || '—'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.finishBtn} onPress={confirmFinish}>
            <Text style={s.finishBtnText}>Finalizar</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={s.timerBar}>
          <View style={s.timeCard}>
            <Text style={s.timeLabel}>Treino</Text>
            <Text style={s.timeValue}>{formatClock(elapsed)}</Text>
          </View>
          <View style={s.timeCard}>
            <Text style={s.timeLabel}>Descanso</Text>
            <Text style={[s.timeValue, restActive ? s.timeValueRestActive : s.timeValueRestIdle]}>
              {restActive ? formatClock(restRemaining) : `00:${String(restDuration).padStart(2, '0')}`}
            </Text>
          </View>
          <View style={s.progressWrap}>
            <Text style={s.progressLabel}>{doneCount}/{totalSets}</Text>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        </View>
        {/* Rest duration pills */}
        <View style={s.restPills}>
          {[30, 60, 90].map((d) => (
            <TouchableOpacity
              key={d}
              style={[s.restPill, restDuration === d && s.restPillActive]}
              onPress={() => setRestDuration(d)}
            >
              <Text style={[s.restPillText, restDuration === d && s.restPillTextActive]}>{d}s</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Exercise list ── */}
      <ScrollView style={s.scroll} contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        {(() => {
          // Group consecutive exercises with the same blockType (biset/triset) into shared cards
          const groups: Array<{ indices: number[]; blockType?: string }> = [];
          let gi = 0;
          while (gi < exercises.length) {
            const bt = exercises[gi].blockType?.toLowerCase();
            if (bt === 'biset' || bt === 'triset') {
              const group: number[] = [gi];
              gi++;
              while (gi < exercises.length && exercises[gi].blockType?.toLowerCase() === bt) {
                group.push(gi);
                gi++;
              }
              groups.push({ indices: group, blockType: bt });
            } else {
              groups.push({ indices: [gi] });
              gi++;
            }
          }

          return groups.map((group, gIdx) => {
            const isBlock = group.indices.length > 1 && group.blockType;
            const blockLabel = group.blockType ? group.blockType.charAt(0).toUpperCase() + group.blockType.slice(1) : undefined;
            const allGroupDone = group.indices.every((exIdx) => exercises[exIdx].sets.every(s => s.done));

            return (
              <View
                key={gIdx}
                style={[
                  s.exCard,
                  allGroupDone && s.exCardDone,
                  isBlock && { borderColor: `${C.primary}60`, borderWidth: 1.5 },
                ]}
              >
                {isBlock && (
                  <View style={s.blockBadge}>
                    <Text style={s.blockBadgeText}>🔗 {blockLabel}</Text>
                  </View>
                )}

                {group.indices.map((exIdx, posInGroup) => {
                  const ex = exercises[exIdx];
                  const allDone = ex.sets.every(s => s.done);
                  return (
                    <View key={exIdx}>
                      {isBlock && posInGroup > 0 && <View style={s.blockDivider} />}
                      <View style={s.exHeader}>
                        <View style={[s.exBadge, allDone && s.exBadgeDone]}>
                          <Text style={s.exBadgeText}>{allDone ? '✓' : exIdx + 1}</Text>
                        </View>
                        <View style={s.exMeta}>
                          <Text style={s.exName}>{ex.name}</Text>
                          <Text style={s.exTarget}>{ex.targetSets}×{ex.targetReps} · {ex.rest}</Text>
                        </View>
                        <TouchableOpacity style={s.subBtn} onPress={() => openAlternatives(exIdx)}>
                          <Text style={s.subBtnText}>↺</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.addSetBtn} onPress={() => addExtraSet(exIdx)}>
                          <Text style={s.addSetBtnText}>＋S</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.addSetBtn}
                          onPress={() => { setHistoryExerciseName(ex.name); setShowHistoryModal(true); }}
                        >
                          <Text style={{ color: C.primaryLight, fontSize: 14 }}>📊</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.addSetBtn, { opacity: exercises.length <= 1 ? 0.4 : 1 }]}
                          disabled={exercises.length <= 1}
                          onPress={() => {
                            Alert.alert('Remover exercício', 'Deseja remover este exercício?', [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Remover', style: 'destructive',
                                onPress: () => setExercises((prev) => prev.filter((_, i) => i !== exIdx)),
                              },
                            ]);
                          }}
                        >
                          <Text style={{ color: '#EF4444', fontSize: 14 }}>🗑</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={s.setHeaderRow}>
                        <Text style={[s.setHeaderCell, { flex: 0.4 }]}>Série</Text>
                        <Text style={[s.setHeaderCell, { flex: 1 }]}>Carga (kg)</Text>
                        <Text style={[s.setHeaderCell, { flex: 1 }]}>Reps</Text>
                        <Text style={[s.setHeaderCell, { flex: 0.6 }]}>OK</Text>
                      </View>

                      {ex.sets.map((set, setIdx) => (
                        <View key={setIdx} style={[s.setRow, set.done && s.setRowDone]}>
                          <Text style={[s.setNum, { flex: 0.4 }]}>{setIdx + 1}</Text>
                          <TextInput
                            style={[s.setInput, { flex: 1 }]}
                            value={set.load} onChangeText={v => updateSet(exIdx, setIdx, 'load', v)}
                            placeholder="—" placeholderTextColor={C.text3}
                            keyboardType="decimal-pad" editable={!set.done} selectTextOnFocus
                          />
                          <TextInput
                            style={[s.setInput, { flex: 1 }]}
                            value={set.reps} onChangeText={v => updateSet(exIdx, setIdx, 'reps', v)}
                            placeholder={ex.targetReps} placeholderTextColor={C.text3}
                            keyboardType="decimal-pad" editable={!set.done} selectTextOnFocus
                          />
                          <TouchableOpacity
                            style={[s.doneCheck, { flex: 0.6 }, set.done && s.doneCheckActive]}
                            onPress={() => toggleSetDone(exIdx, setIdx)}
                          >
                            <Text style={[s.doneCheckText, set.done && s.doneCheckTextActive]}>
                              {set.done ? '✓' : '○'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            );
          });
        })()}

        <TouchableOpacity style={s.finishBig} onPress={confirmFinish} activeOpacity={0.85}>
          <Text style={s.finishBigText}>🏁  Finalizar e Salvar Treino</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.addExerciseBtn} onPress={() => setShowAddExercise(true)} activeOpacity={0.85}>
          <Text style={s.addExerciseBtnText}>＋ Adicionar Exercício</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── HR input modal ── */}
      <Modal visible={showHrModal} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowHrModal(false)}>
          <View style={s.cfgBox} onStartShouldSetResponder={() => true}>
            <Text style={s.cfgTitle}>❤️ Frequência Cardíaca</Text>
            <TextInput
              style={s.cfgInput} value={hrBpm} onChangeText={setHrBpm}
              placeholder="Ex: 145" placeholderTextColor={C.text3}
              keyboardType="numeric" autoFocus selectTextOnFocus
            />
            <Text style={s.cfgHint}>BPM médio do treino</Text>
            <TouchableOpacity style={s.cfgApply} onPress={() => setShowHrModal(false)}>
              <Text style={s.cfgApplyText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Alternatives bottom sheet ── */}
      <Modal visible={showAlts} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowAlts(false)}>
          <View style={[s.altSheet, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <View style={s.altHandle} />
            <Text style={s.altTitle}>Substituir Exercício</Text>
            {selectedExIdx !== null && <Text style={s.altCurrent}>Atual: {exercises[selectedExIdx]?.name}</Text>}
            {loadingAlts ? (
              <Text style={s.altLoading}>Buscando alternativas com IA...</Text>
            ) : alternatives.map((alt, i) => (
              <TouchableOpacity key={i} style={s.altRow} onPress={() => substituteExercise(alt)}>
                <View style={s.altNumBadge}><Text style={s.altNum}>{i + 1}</Text></View>
                <Text style={s.altName}>{alt}</Text>
                <Text style={s.altArrow}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.altCancel} onPress={() => setShowAlts(false)}>
              <Text style={s.altCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Share / Summary modal (full screen) ── */}
      <Modal visible={showShare} transparent={false} animationType="slide">
        <View style={s.summaryScreen}>
          {/* Hidden capture refs (rendered off-screen) */}
          <View style={s.hiddenCaptures}>
            <ViewShot ref={shareRef} options={{ format: 'png', quality: 0.95 }}>
              {savedWorkout && <WorkoutSummaryCard workout={savedWorkout} avgHeartRate={avgHr} />}
            </ViewShot>
            <ViewShot ref={storyRef} options={{ format: 'png', quality: 0.95 }}>
              {savedWorkout && <WorkoutStoryCard workout={savedWorkout} avgHeartRate={avgHr} />}
            </ViewShot>
          </View>

          <ScrollView
            style={s.summaryScroll}
            contentContainerStyle={[s.summaryScrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.shareTitle}>🏁 Treino Finalizado!</Text>
            <Text style={s.shareSub}>Confira o resumo e compartilhe seu treino</Text>

            {/* Visible summary card */}
            {savedWorkout && <WorkoutSummaryCard workout={savedWorkout} avgHeartRate={avgHr} />}

            {/* Share options */}
            <Text style={s.shareSectionLabel}>COMPARTILHAR</Text>
            <TouchableOpacity style={s.shareBtn} onPress={handleShare} disabled={sharing}>
              <Text style={s.shareBtnText}>{sharing ? 'Gerando...' : '📤 Postar no Instagram / WhatsApp'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.shareBtn, s.shareBtnStory]} onPress={handleShareStory} disabled={sharing}>
              <Text style={s.shareBtnText}>{sharing ? 'Gerando...' : '📱 Story Instagram (9:16)'}</Text>
            </TouchableOpacity>

            {/* Finalize button */}
            <TouchableOpacity
              style={s.shareFinalizeBtn}
              onPress={() => {
                setShowShare(false);
                navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
              }}
            >
              <Text style={s.shareFinalizeBtnText}>✅ Finalizar Treino</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showAddExercise} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowAddExercise(false)}>
          <View style={s.cfgBox} onStartShouldSetResponder={() => true}>
            <Text style={s.cfgTitle}>Adicionar Exercício</Text>

            {/* Block type selector */}
            <Text style={{ color: C.text3, fontSize: 11, fontWeight: '700', marginBottom: 6, textAlign: 'center' }}>TIPO DE BLOCO</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['Normal', 'Biset', 'Triset', 'Superset'].map((bt) => (
                <TouchableOpacity
                  key={bt}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                    backgroundColor: newExBlockType === bt ? C.primary : C.elevated,
                    borderWidth: 1, borderColor: newExBlockType === bt ? C.primary : C.border,
                  }}
                  onPress={() => setNewExBlockType(bt)}
                >
                  <Text style={{ color: newExBlockType === bt ? '#fff' : C.text2, fontSize: 12, fontWeight: '700' }}>{bt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={s.cfgInput}
              value={newExerciseName}
              onChangeText={setNewExerciseName}
              placeholder={newExBlockType !== 'Normal' ? 'Exercício 1' : 'Nome do exercício'}
              placeholderTextColor={C.text3}
            />
            {(newExBlockType === 'Biset' || newExBlockType === 'Triset' || newExBlockType === 'Superset') && (
              <TextInput style={[s.cfgInput, { marginTop: 6 }]} value={newExName2} onChangeText={setNewExName2} placeholder="Exercício 2" placeholderTextColor={C.text3} />
            )}
            {(newExBlockType === 'Triset' || newExBlockType === 'Superset') && (
              <TextInput style={[s.cfgInput, { marginTop: 6 }]} value={newExName3} onChangeText={setNewExName3} placeholder="Exercício 3" placeholderTextColor={C.text3} />
            )}
            {newExBlockType === 'Superset' && (
              <TextInput style={[s.cfgInput, { marginTop: 6 }]} value={newExName4} onChangeText={setNewExName4} placeholder="Exercício 4" placeholderTextColor={C.text3} />
            )}
            <View style={[s.quickInputRow, { marginTop: 6 }]}>
              <TextInput
                style={[s.cfgInput, s.quickInput]}
                value={newExerciseSets}
                onChangeText={setNewExerciseSets}
                placeholder="Séries"
                placeholderTextColor={C.text3}
                keyboardType="numeric"
              />
              <TextInput
                style={[s.cfgInput, s.quickInput]}
                value={newExerciseReps}
                onChangeText={setNewExerciseReps}
                placeholder="Reps"
                placeholderTextColor={C.text3}
              />
            </View>
            <TextInput
              style={[s.cfgInput, { marginTop: 6 }]}
              value={newExerciseRest}
              onChangeText={setNewExerciseRest}
              placeholder="Descanso (ex: 90s)"
              placeholderTextColor={C.text3}
            />
            <TouchableOpacity style={[s.cfgApply, { marginTop: 10 }]} onPress={addManualExercise}>
              <Text style={s.cfgApplyText}>Adicionar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ExerciseHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        exerciseName={historyExerciseName}
        history={workoutHistory}
      />

      {/* Sessions Celebration Modal */}
      <Modal visible={showCelebration} transparent animationType="fade">
        <View style={s.celebrationOverlay}>
          <Animated.View style={[s.celebrationCard, { transform: [{ scale: celebrationScale }] }]}>
            <Text style={s.celebrationEmoji}>🎯</Text>
            <Text style={s.celebrationTitle}>Treino Concluído!</Text>
            {sessionsRemaining !== null && sessionsRemaining > 0 ? (
              <Text style={s.celebrationSub}>Sessões restantes: {sessionsRemaining}</Text>
            ) : sessionsRemaining === 0 ? (
              <Text style={s.celebrationSub}>🏆 Você completou todas as sessões!</Text>
            ) : null}
            <TouchableOpacity
              style={s.celebrationBtn}
              onPress={() => setShowCelebration(false)}
            >
              <Text style={s.celebrationBtnText}>Continuar</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  exitBtn: { color: C.text2, fontSize: 18, padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: C.text1, fontSize: 15, fontWeight: '800' },
  headerSub: { color: C.text3, fontSize: 11, marginTop: 1 },
  hrBadge: { backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  hrBadgeText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },
  finishBtn: { backgroundColor: C.success, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  finishBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  timerBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  restPills: { flexDirection: 'row', gap: 6, marginTop: 8, justifyContent: 'center' },
  restPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border },
  restPillActive: { backgroundColor: C.primary, borderColor: C.primary },
  restPillText: { color: C.text2, fontSize: 12, fontWeight: '700' },
  restPillTextActive: { color: '#fff' },
  timeCard: {
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 74,
    alignItems: 'center',
  },
  timeLabel: { color: C.text3, fontSize: 10, fontWeight: '700' },
  timeValue: { color: C.text1, fontSize: 14, fontWeight: '800', marginTop: 1 },
  timeValueRestActive: { color: C.warning },
  timeValueRestIdle: { color: C.primaryLight },
  progressWrap: { flex: 1, alignItems: 'center' },
  progressLabel: { color: C.primaryLight, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  progressTrack: { height: 4, backgroundColor: C.elevated, borderRadius: 2, overflow: 'hidden', width: '100%' },
  progressFill: { height: 4, backgroundColor: C.primary, borderRadius: 2 },

  scroll: { flex: 1, backgroundColor: C.bg },
  scrollContent: { padding: 16, gap: 12 },

  exCard: { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  exCardDone: { borderColor: `${C.success}50`, backgroundColor: 'rgba(16,185,129,0.04)' },
  blockBadge: { alignSelf: 'flex-start', backgroundColor: C.primaryGlow, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  blockBadgeText: { color: C.primaryLight, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  blockDivider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  exHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  exBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  exBadgeDone: { backgroundColor: C.success },
  exBadgeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  exMeta: { flex: 1 },
  exName: { color: C.text1, fontWeight: '700', fontSize: 15 },
  exTarget: { color: C.text3, fontSize: 12, marginTop: 2 },
  subBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  subBtnText: { color: C.primaryLight, fontSize: 20, fontWeight: '700' },
  addSetBtn: { width: 42, height: 36, borderRadius: 10, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  addSetBtnText: { color: C.success, fontSize: 13, fontWeight: '800' },

  setHeaderRow: { flexDirection: 'row', paddingHorizontal: 2, marginBottom: 2 },
  setHeaderCell: { color: C.text3, fontSize: 10, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, borderRadius: 8, paddingHorizontal: 2 },
  setRowDone: { backgroundColor: 'rgba(16,185,129,0.07)' },
  setNum: { color: C.text3, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  setInput: { backgroundColor: C.elevated, borderRadius: 8, height: 38, textAlign: 'center', color: C.text1, fontSize: 15, fontWeight: '700', borderWidth: 1, borderColor: C.border },
  doneCheck: { height: 38, borderRadius: 8, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  doneCheckActive: { backgroundColor: C.success, borderColor: C.success },
  doneCheckText: { color: C.text3, fontSize: 16, fontWeight: '700' },
  doneCheckTextActive: { color: '#fff' },

  finishBig: { backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  finishBigText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  addExerciseBtn: { backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  addExerciseBtnText: { color: C.primaryLight, fontSize: 15, fontWeight: '800' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center' },

  cfgBox: { backgroundColor: C.surface, borderRadius: 20, padding: 24, width: '82%', borderWidth: 1, borderColor: C.border },
  cfgTitle: { color: C.text1, fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  cfgInput: { backgroundColor: C.elevated, borderRadius: 12, padding: 14, color: C.text1, fontSize: 32, fontWeight: '900', textAlign: 'center', borderWidth: 1, borderColor: C.border },
  cfgHint: { color: C.text3, fontSize: 12, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  cfgApply: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cfgApplyText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  quickInputRow: { flexDirection: 'row', gap: 8 },
  quickInput: { flex: 1 },

  altSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: C.border },
  altHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  altTitle: { color: C.text1, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  altCurrent: { color: C.text3, fontSize: 13, marginBottom: 16 },
  altLoading: { color: C.text2, fontSize: 15, textAlign: 'center', paddingVertical: 28 },
  altRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  altNumBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  altNum: { color: C.primaryLight, fontWeight: '800', fontSize: 13 },
  altName: { flex: 1, color: C.text1, fontSize: 15, fontWeight: '600' },
  altArrow: { color: C.text3, fontSize: 22 },
  altCancel: { marginTop: 14, paddingVertical: 12, alignItems: 'center' },
  altCancelText: { color: C.text3, fontSize: 15 },

  shareTitle: { color: C.text1, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  shareSub: { color: C.text3, fontSize: 13, textAlign: 'center', marginTop: 4 },
  hiddenCaptures: { position: 'absolute', left: -9999, top: 0, opacity: 0 },
  shareBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  shareBtnStory: { backgroundColor: '#EC4899' },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  shareFinalizeBtn: { backgroundColor: C.success, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, shadowColor: C.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  shareFinalizeBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  summaryScreen: { flex: 1, backgroundColor: C.bg },
  summaryScroll: { flex: 1 },
  summaryScrollContent: { padding: 20, gap: 16 },
  shareSectionLabel: { color: C.text3, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 8 },

  // Celebration modal
  celebrationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  celebrationCard: {
    backgroundColor: C.surface, borderRadius: 24, padding: 32,
    alignItems: 'center', width: '80%', borderWidth: 1, borderColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
  },
  celebrationEmoji: { fontSize: 64, marginBottom: 12 },
  celebrationTitle: { color: C.text1, fontSize: 22, fontWeight: '900', marginBottom: 8 },
  celebrationSub: { color: C.primaryLight, fontSize: 16, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  celebrationBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 32 },
  celebrationBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
