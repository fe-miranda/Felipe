import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Vibration,
  KeyboardAvoidingView,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, ExerciseLog, SetLog, CompletedWorkout } from '../types';
import { getExerciseAlternatives } from '../services/aiService';
import { saveWorkout } from '../services/workoutHistoryService';
import { useHeartRate } from '../hooks/useHeartRate';
import { hrZoneColor, hrZoneLabel } from '../services/heartRateService';
import { shareWorkoutCard } from '../services/shareService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ActiveWorkout'>;
  route: RouteProp<RootStackParamList, 'ActiveWorkout'>;
};

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA', primaryGlow: 'rgba(124,58,237,0.15)',
  success: '#10B981', warning: '#F59E0B',
  text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

function pad2(n: number) { return String(n).padStart(2, '0'); }
function fmtTime(s: number) { return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`; }

function buildExerciseLogs(workout: Props['route']['params']['workout']): ExerciseLog[] {
  return workout.exercises.map(ex => ({
    name: ex.name,
    targetSets: ex.sets,
    targetReps: ex.reps,
    rest: ex.rest,
    sets: Array.from<SetLog>({ length: ex.sets }, () => ({ load: '', reps: '', done: false })),
  }));
}

export function ActiveWorkoutScreen({ navigation, route }: Props) {
  const { workout, context } = route.params;
  const insets = useSafeAreaInsets();
  const hr = useHeartRate();

  // ── Timer state ──
  // Elapsed time is derived from a stored start timestamp so it remains
  // accurate when the app goes to the background (screen locked, etc.).
  const workoutStartRef = useRef<number>(Date.now());    // epoch ms when workout started
  const [elapsed, setElapsed] = useState(0);             // seconds, recomputed from timestamp

  // Rest countdown — tracked via the deadline timestamp so background time counts.
  const [restActive, setRestActive] = useState(false);
  const restDeadlineRef = useRef<number | null>(null);   // epoch ms when rest should end
  const [restRemaining, setRestRemaining] = useState(0);
  const [restDuration, setRestDuration] = useState(90);
  const [showRestConfig, setShowRestConfig] = useState(false);
  const [restInput, setRestInput] = useState('90');

  // ── Exercise state ──
  const [exercises, setExercises] = useState<ExerciseLog[]>(() => buildExerciseLogs(workout));

  // ── Substitution state ──
  const [showAlts, setShowAlts] = useState(false);
  const [selectedExIdx, setSelectedExIdx] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [loadingAlts, setLoadingAlts] = useState(false);

  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  // ── Tick function — recalculates both timers from timestamps ──────────────
  const tick = useCallback(() => {
    const nowMs = Date.now();

    // Elapsed stopwatch
    const elapsedSec = Math.floor((nowMs - workoutStartRef.current) / 1000);
    setElapsed(elapsedSec);

    // Rest countdown
    if (restDeadlineRef.current !== null) {
      const remaining = Math.ceil((restDeadlineRef.current - nowMs) / 1000);
      if (remaining <= 0) {
        restDeadlineRef.current = null;
        setRestActive(false);
        setRestRemaining(0);
        Vibration.vibrate([0, 300, 150, 300, 150, 500]);
      } else {
        setRestRemaining(remaining);
      }
    }
  }, []);

  // Stopwatch — ticks every second while screen is foregrounded.
  // On resume from background, tick() immediately resynchronises from timestamps.
  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  // AppState listener — resync timers immediately when app returns to foreground.
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        tick();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [tick]);

  const startRest = useCallback((dur?: number) => {
    const d = dur ?? restDuration;
    restDeadlineRef.current = Date.now() + d * 1000;
    setRestRemaining(d);
    setRestActive(true);
  }, [restDuration]);

  const stopRest = useCallback(() => {
    restDeadlineRef.current = null;
    setRestActive(false);
    setRestRemaining(0);
  }, []);

  const applyRestConfig = useCallback(() => {
    const parsed = parseInt(restInput, 10);
    if (!isNaN(parsed) && parsed >= 10 && parsed <= 600) {
      setRestDuration(parsed);
      setShowRestConfig(false);
    } else {
      Alert.alert('Valor inválido', 'Digite um tempo entre 10 e 600 segundos.');
    }
  }, [restInput]);

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

  const openAlternatives = useCallback(async (exIdx: number) => {
    setSelectedExIdx(exIdx);
    setAlternatives([]);
    setLoadingAlts(true);
    setShowAlts(true);
    try {
      const alts = await getExerciseAlternatives(
        exercises[exIdx].name,
        workout.focus,
        exercises.map(e => e.name),
      );
      setAlternatives(alts.length ? alts : ['Exercício Alternativo 1', 'Exercício Alternativo 2', 'Exercício Alternativo 3']);
    } catch {
      setAlternatives(['Exercício Alternativo 1', 'Exercício Alternativo 2', 'Exercício Alternativo 3']);
    } finally {
      setLoadingAlts(false);
    }
  }, [exercises, workout.focus]);

  const substituteExercise = useCallback((name: string) => {
    if (selectedExIdx === null) return;
    setExercises(prev => {
      const next = [...prev];
      next[selectedExIdx] = {
        ...next[selectedExIdx],
        name,
        sets: next[selectedExIdx].sets.map(s => ({ ...s, done: false })),
      };
      return next;
    });
    setShowAlts(false);
  }, [selectedExIdx]);

  const confirmExit = useCallback(() => {
    Alert.alert('Sair do treino', 'O progresso não será salvo. Deseja sair?', [
      { text: 'Continuar treino', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  }, [navigation]);

  const finishWorkout = useCallback(() => {
    const done = exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
    const total = exercises.reduce((a, e) => a + e.sets.length, 0);
    Alert.alert(
      'Finalizar Treino',
      `${done}/${total} séries concluídas.\nDeseja salvar no histórico?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salvar Treino',
          onPress: async () => {
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
            // Offer to share the workout card
            Alert.alert(
              'Treino Salvo! 🎉',
              'Quer compartilhar seu resultado?',
              [
                { text: 'Agora não', onPress: () => navigation.navigate('WorkoutHistory') },
                {
                  text: 'Compartilhar 📤',
                  onPress: async () => {
                    try {
                      await shareWorkoutCard({
                        workout: log,
                        heartRateSamples: hr.samples,
                      });
                    } catch {
                      // ignore share errors
                    }
                    navigation.navigate('WorkoutHistory');
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [exercises, workout, context, navigation, hr.samples]);

  const doneCount = exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0);
  const progress = totalSets > 0 ? doneCount / totalSets : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Sticky header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={confirmExit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.exitBtn}>✕</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle} numberOfLines={1}>{workout.focus}</Text>
            <Text style={s.headerSub}>{workout.dayOfWeek}</Text>
          </View>
          <TouchableOpacity style={s.finishBtn} onPress={finishWorkout}>
            <Text style={s.finishBtnText}>Finalizar</Text>
          </TouchableOpacity>
        </View>

        {/* ── Timer + progress bar ── */}
        <View style={s.timerBar}>
          <View style={s.elapsed}>
            <Text style={s.timerLabel}>TEMPO</Text>
            <Text style={s.timerValue}>{fmtTime(elapsed)}</Text>
          </View>

          {/* Heart-rate badge */}
          <TouchableOpacity
            style={[s.hrBadge, hr.status === 'connected' && { borderColor: hrZoneColor(hr.bpm) }]}
            onPress={() => hr.status === 'connected' ? hr.disconnect() : hr.connect()}
          >
            <Text style={s.hrBadgeIcon}>❤️</Text>
            {hr.status === 'connected' && hr.bpm !== null ? (
              <View>
                <Text style={[s.hrBadgeBpm, { color: hrZoneColor(hr.bpm) }]}>{hr.bpm} bpm</Text>
                <Text style={[s.hrBadgeZone, { color: hrZoneColor(hr.bpm) }]}>{hrZoneLabel(hr.bpm)}</Text>
              </View>
            ) : (
              <Text style={s.hrBadgeIdle}>
                {hr.status === 'scanning' || hr.status === 'connecting' ? 'Conectando…' : 'Conectar'}
              </Text>
            )}
          </TouchableOpacity>

          {restActive ? (
            <TouchableOpacity style={s.restActive} onPress={stopRest} activeOpacity={0.8}>
              <Text style={s.restActiveLabel}>DESCANSO — toque para cancelar</Text>
              <Text style={s.restActiveValue}>{fmtTime(restRemaining)}</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.restIdleRow}>
              <TouchableOpacity style={s.restBtn} onPress={() => startRest()} activeOpacity={0.8}>
                <Text style={s.restBtnText}>⏸  {fmtTime(restDuration)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.restCfgBtn}
                onPress={() => { setRestInput(String(restDuration)); setShowRestConfig(true); }}
              >
                <Text style={s.restCfgIcon}>⚙</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.progressWrap}>
            <Text style={s.progressLabel}>{doneCount}/{totalSets}</Text>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        </View>
      </View>

      {/* ── Exercise list ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.map((ex, exIdx) => {
          const allDone = ex.sets.every(s => s.done);
          return (
            <View key={exIdx} style={[s.exCard, allDone && s.exCardDone]}>
              <View style={s.exHeader}>
                <View style={[s.exBadge, allDone && s.exBadgeDone]}>
                  <Text style={s.exBadgeText}>{allDone ? '✓' : exIdx + 1}</Text>
                </View>
                <View style={s.exMeta}>
                  <Text style={s.exName}>{ex.name}</Text>
                  <Text style={s.exTarget}>{ex.targetSets} séries × {ex.targetReps} · {ex.rest}</Text>
                </View>
                <TouchableOpacity style={s.subBtn} onPress={() => openAlternatives(exIdx)}>
                  <Text style={s.subBtnText}>↺</Text>
                </TouchableOpacity>
              </View>

              {/* Column headers */}
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
                    value={set.load}
                    onChangeText={v => updateSet(exIdx, setIdx, 'load', v)}
                    placeholder="—"
                    placeholderTextColor={C.text3}
                    keyboardType="decimal-pad"
                    editable={!set.done}
                    selectTextOnFocus
                  />
                  <TextInput
                    style={[s.setInput, { flex: 1 }]}
                    value={set.reps}
                    onChangeText={v => updateSet(exIdx, setIdx, 'reps', v)}
                    placeholder={ex.targetReps}
                    placeholderTextColor={C.text3}
                    keyboardType="decimal-pad"
                    editable={!set.done}
                    selectTextOnFocus
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

        <TouchableOpacity style={s.finishBig} onPress={finishWorkout} activeOpacity={0.85}>
          <Text style={s.finishBigText}>🏁  Finalizar e Salvar Treino</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Rest config modal ── */}
      <Modal visible={showRestConfig} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowRestConfig(false)}>
          <View style={s.cfgBox} onStartShouldSetResponder={() => true}>
            <Text style={s.cfgTitle}>Tempo de Descanso</Text>
            <TextInput
              style={s.cfgInput}
              value={restInput}
              onChangeText={setRestInput}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
            />
            <Text style={s.cfgHint}>segundos (10 – 600)</Text>
            <View style={s.presetRow}>
              {[30, 60, 90, 120].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[s.preset, restDuration === v && s.presetActive]}
                  onPress={() => { setRestInput(String(v)); setRestDuration(v); setShowRestConfig(false); }}
                >
                  <Text style={[s.presetText, restDuration === v && s.presetTextActive]}>{v}s</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.cfgApply} onPress={applyRestConfig}>
              <Text style={s.cfgApplyText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Alternatives bottom sheet ── */}
      <Modal visible={showAlts} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowAlts(false)}>
          <View
            style={[s.altSheet, { paddingBottom: insets.bottom + 16 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={s.altHandle} />
            <Text style={s.altTitle}>Substituir Exercício</Text>
            {selectedExIdx !== null && (
              <Text style={s.altCurrent}>Atual: {exercises[selectedExIdx]?.name}</Text>
            )}
            {loadingAlts ? (
              <Text style={s.altLoading}>Buscando alternativas com IA...</Text>
            ) : (
              alternatives.map((alt, i) => (
                <TouchableOpacity key={i} style={s.altRow} onPress={() => substituteExercise(alt)}>
                  <View style={s.altNumBadge}>
                    <Text style={s.altNum}>{i + 1}</Text>
                  </View>
                  <Text style={s.altName}>{alt}</Text>
                  <Text style={s.altArrow}>›</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={s.altCancel} onPress={() => setShowAlts(false)}>
              <Text style={s.altCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  // Header
  header: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  exitBtn: { color: C.text2, fontSize: 18, padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: C.text1, fontSize: 16, fontWeight: '800' },
  headerSub: { color: C.text3, fontSize: 12, marginTop: 1 },
  finishBtn: { backgroundColor: C.success, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  finishBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Timer bar
  timerBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  elapsed: { alignItems: 'center', minWidth: 64 },
  timerLabel: { color: C.text3, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  timerValue: { color: C.text1, fontSize: 24, fontWeight: '900' },

  restActive: {
    flex: 1, alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 12, padding: 8,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
  },
  restActiveLabel: { color: C.warning, fontSize: 9, fontWeight: '600' },
  restActiveValue: { color: C.warning, fontSize: 26, fontWeight: '900' },

  restIdleRow: { flex: 1, flexDirection: 'row', gap: 6 },
  restBtn: {
    flex: 1, backgroundColor: C.elevated, borderRadius: 10,
    alignItems: 'center', paddingVertical: 9,
    borderWidth: 1, borderColor: C.border,
  },
  restBtnText: { color: C.text2, fontSize: 14, fontWeight: '700' },
  restCfgBtn: {
    width: 38, backgroundColor: C.elevated, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  restCfgIcon: { color: C.text3, fontSize: 16 },

  progressWrap: { alignItems: 'center', minWidth: 46 },
  progressLabel: { color: C.primaryLight, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  progressTrack: { width: 38, height: 4, backgroundColor: C.elevated, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: C.primary, borderRadius: 2 },

  // Scroll
  scroll: { flex: 1, backgroundColor: C.bg },
  scrollContent: { padding: 16, gap: 12 },

  // Exercise card
  exCard: {
    backgroundColor: C.surface, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: C.border,
  },
  exCardDone: { borderColor: `${C.success}50`, backgroundColor: 'rgba(16,185,129,0.04)' },
  exHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  exBadge: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  exBadgeDone: { backgroundColor: C.success },
  exBadgeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  exMeta: { flex: 1 },
  exName: { color: C.text1, fontWeight: '700', fontSize: 15 },
  exTarget: { color: C.text3, fontSize: 12, marginTop: 2 },
  subBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  subBtnText: { color: C.primaryLight, fontSize: 20, fontWeight: '700' },

  setHeaderRow: { flexDirection: 'row', paddingHorizontal: 2, marginBottom: 2 },
  setHeaderCell: { color: C.text3, fontSize: 10, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },

  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, borderRadius: 8, paddingHorizontal: 2 },
  setRowDone: { backgroundColor: 'rgba(16,185,129,0.07)' },
  setNum: { color: C.text3, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  setInput: {
    backgroundColor: C.elevated, borderRadius: 8, height: 38,
    textAlign: 'center', color: C.text1, fontSize: 15, fontWeight: '700',
    borderWidth: 1, borderColor: C.border,
  },
  doneCheck: {
    height: 38, borderRadius: 8,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  doneCheckActive: { backgroundColor: C.success, borderColor: C.success },
  doneCheckText: { color: C.text3, fontSize: 16, fontWeight: '700' },
  doneCheckTextActive: { color: '#fff' },

  finishBig: {
    backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  finishBigText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Modals shared
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center' },

  // Rest config
  cfgBox: {
    backgroundColor: C.surface, borderRadius: 20, padding: 24,
    width: '82%', borderWidth: 1, borderColor: C.border,
  },
  cfgTitle: { color: C.text1, fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  cfgInput: {
    backgroundColor: C.elevated, borderRadius: 12, padding: 14,
    color: C.text1, fontSize: 32, fontWeight: '900', textAlign: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  cfgHint: { color: C.text3, fontSize: 12, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  preset: {
    flex: 1, backgroundColor: C.elevated, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  presetActive: { backgroundColor: C.primaryGlow, borderColor: C.primary },
  presetText: { color: C.text2, fontWeight: '700', fontSize: 15 },
  presetTextActive: { color: C.primaryLight },
  cfgApply: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cfgApplyText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Timer bar — heart rate badge
  hrBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.elevated, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: C.border,
  },
  hrBadgeIcon: { fontSize: 14 },
  hrBadgeBpm: { fontSize: 14, fontWeight: '900' },
  hrBadgeZone: { fontSize: 9, fontWeight: '600', marginTop: 1 },
  hrBadgeIdle: { color: C.text3, fontSize: 12 },

  // Alternatives sheet
  altSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1, borderColor: C.border,
  },
  altHandle: {
    width: 36, height: 4, backgroundColor: C.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  altTitle: { color: C.text1, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  altCurrent: { color: C.text3, fontSize: 13, marginBottom: 16 },
  altLoading: { color: C.text2, fontSize: 15, textAlign: 'center', paddingVertical: 28 },
  altRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  altNumBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center',
  },
  altNum: { color: C.primaryLight, fontWeight: '800', fontSize: 13 },
  altName: { flex: 1, color: C.text1, fontSize: 15, fontWeight: '600' },
  altArrow: { color: C.text3, fontSize: 22 },
  altCancel: { marginTop: 14, paddingVertical: 12, alignItems: 'center' },
  altCancelText: { color: C.text3, fontSize: 15 },
});
