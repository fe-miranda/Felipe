import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, QuickWorkout, WorkoutDay, CompletedWorkout } from '../types';
import { usePlan } from '../hooks/usePlan';
import { useHeartRate } from '../hooks/useHeartRate';
import { useCarouselCustomization } from '../hooks/useCarouselCustomization';
import { setRuntimeApiKey } from '../services/aiService';
import { loadHistory } from '../services/workoutHistoryService';
import { hrZoneColor, hrZoneLabel } from '../services/heartRateService';
import { shareWeeklyCard, buildWeeklyCardData } from '../services/shareService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 3;

const CUSTOM_KEY_STORAGE = '@gymapp_custom_apikey';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#07070F',
  surface: '#0F0F1A',
  elevated: '#161625',
  border: '#1E1E30',
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryGlow: 'rgba(124,58,237,0.18)',
  success: '#10B981',
  successBg: 'rgba(16,185,129,0.12)',
  warning: '#F59E0B',
  text1: '#F1F5F9',
  text2: '#94A3B8',
  text3: '#475569',
};

const GOAL_META: Record<string, { icon: string; label: string }> = {
  lose_weight:       { icon: '🔥', label: 'Perda de Peso' },
  gain_muscle:       { icon: '💪', label: 'Ganho de Massa' },
  improve_endurance: { icon: '🏃', label: 'Resistência' },
  increase_strength: { icon: '🏋️', label: 'Força' },
  general_fitness:   { icon: '⚡', label: 'Condicionamento' },
};

// Phase: 0-indexed months → color + label
const PHASE = (i: number) => {
  if (i < 3)  return { color: '#10B981', label: 'Base',          bg: 'rgba(16,185,129,0.15)' };
  if (i < 6)  return { color: '#3B82F6', label: 'Evolução',      bg: 'rgba(59,130,246,0.15)' };
  if (i < 9)  return { color: '#F59E0B', label: 'Intensidade',   bg: 'rgba(245,158,11,0.15)' };
  return               { color: '#EF4444', label: 'Pico',          bg: 'rgba(239,68,68,0.15)' };
};

const MONTH_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ─── Quick workout templates ──────────────────────────────────────────────────

const QUICK_WORKOUTS: QuickWorkout[] = [
  {
    id: 'hiit', name: 'HIIT Express', icon: '⚡', duration: 20,
    color: '#EF4444', description: 'Alta intensidade, queima máxima', tag: 'Queima Rápida',
    exercises: [
      { name: 'Burpee',           sets: 4, reps: '10',  rest: '30s', muscleGroups: ['Peito', 'Quadríceps', 'Core'] },
      { name: 'Mountain Climber', sets: 4, reps: '30s', rest: '20s', muscleGroups: ['Core', 'Ombro'] },
      { name: 'Jump Squat',       sets: 3, reps: '15',  rest: '30s', muscleGroups: ['Quadríceps', 'Glúteo'] },
      { name: 'High Knees',       sets: 3, reps: '30s', rest: '20s', muscleGroups: ['Quadríceps', 'Panturrilha'] },
    ],
  },
  {
    id: 'biset', name: 'Biset Força', icon: '🏋️', duration: 35,
    color: '#7C3AED', description: 'Empurrar + Puxar em biset', tag: 'Biset',
    exercises: [
      { name: 'Supino Reto',       sets: 4, reps: '10', rest: '60s', notes: 'Biset c/ Remada', muscleGroups: ['Peito', 'Tríceps'] },
      { name: 'Remada Curvada',    sets: 4, reps: '10', rest: '60s', notes: 'Biset c/ Supino', muscleGroups: ['Dorsal', 'Bíceps', 'Trapézio'] },
      { name: 'Desenvolvimento',   sets: 3, reps: '12', rest: '60s', notes: 'Biset c/ Puxada', muscleGroups: ['Ombro', 'Tríceps'] },
      { name: 'Puxada Frontal',    sets: 3, reps: '12', rest: '60s', notes: 'Biset c/ Desenvolvimento', muscleGroups: ['Dorsal', 'Bíceps'] },
    ],
  },
  {
    id: 'pyramid', name: 'Pirâmide', icon: '📈', duration: 40,
    color: '#F59E0B', description: 'Progride a carga a cada série', tag: 'Pirâmide',
    exercises: [
      { name: 'Agachamento Livre', sets: 5, reps: '15/12/10/8/6', rest: '90s', notes: 'Aumente a carga a cada série', muscleGroups: ['Quadríceps', 'Glúteo'] },
      { name: 'Leg Press',         sets: 4, reps: '15/12/10/8',   rest: '75s', notes: 'Pirâmide crescente', muscleGroups: ['Quadríceps', 'Glúteo'] },
      { name: 'Cadeira Extensora', sets: 3, reps: '15/12/10',     rest: '60s', notes: 'Finalizador', muscleGroups: ['Quadríceps'] },
    ],
  },
  {
    id: 'dropset', name: 'Dropset', icon: '📉', duration: 30,
    color: '#10B981', description: 'Reduza a carga sem parar', tag: 'Dropset',
    exercises: [
      { name: 'Rosca Direta',   sets: 3, reps: '12+drop', rest: '90s', notes: 'Dropset: tire 20% da carga e continue', muscleGroups: ['Bíceps', 'Antebraço'] },
      { name: 'Tríceps Pulley', sets: 3, reps: '12+drop', rest: '90s', notes: 'Dropset no mesmo cabo', muscleGroups: ['Tríceps'] },
      { name: 'Elevação Lateral', sets: 3, reps: '15+drop', rest: '75s', notes: 'Dropset com halter', muscleGroups: ['Ombro', 'Trapézio'] },
    ],
  },
  {
    id: 'crossfit', name: 'CrossFit WOD', icon: '🏅', duration: 25,
    color: '#3B82F6', description: 'Condicionamento funcional intenso', tag: 'Funcional',
    exercises: [
      { name: 'Thruster (barra)',  sets: 5, reps: '10', rest: '45s', muscleGroups: ['Ombro', 'Quadríceps', 'Glúteo'] },
      { name: 'Pull-up',          sets: 5, reps: '8',  rest: '45s', muscleGroups: ['Dorsal', 'Bíceps', 'Antebraço'] },
      { name: 'Box Jump',         sets: 4, reps: '12', rest: '30s', muscleGroups: ['Quadríceps', 'Panturrilha', 'Glúteo'] },
      { name: 'Kettlebell Swing', sets: 4, reps: '15', rest: '30s', muscleGroups: ['Posterior', 'Glúteo', 'Core'] },
    ],
  },
  {
    id: 'triset', name: 'Triset Core', icon: '🔥', duration: 20,
    color: '#EC4899', description: 'Triset para abdômen e core', tag: 'Triset',
    exercises: [
      { name: 'Prancha',         sets: 4, reps: '45s', rest: '0s',  notes: 'Triset 1/3', muscleGroups: ['Core'] },
      { name: 'Abdominal Bici',  sets: 4, reps: '20',  rest: '0s',  notes: 'Triset 2/3', muscleGroups: ['Core'] },
      { name: 'Russian Twist',   sets: 4, reps: '20',  rest: '60s', notes: 'Triset 3/3 — descanse aqui', muscleGroups: ['Core'] },
    ],
  },
  {
    id: 'mobility', name: 'Mobilidade & Flexibilidade', icon: '🧘', duration: 30,
    color: '#22C55E', description: 'Alongamentos dinâmicos e mobilidade articular', tag: 'Mobilidade',
    exercises: [
      { name: 'Alongamento de Quadril', sets: 3, reps: '45s', rest: '15s', muscleGroups: ['Glúteo', 'Adutor/Abdutor'] },
      { name: 'Mobilidade Torácica', sets: 3, reps: '12', rest: '20s', muscleGroups: ['Dorsal', 'Trapézio'] },
      { name: 'Alongamento de Isquiotibiais', sets: 3, reps: '40s', rest: '20s', muscleGroups: ['Posterior'] },
      { name: 'Yoga Dinâmica (Flow)', sets: 2, reps: '6min', rest: '30s', muscleGroups: ['Core', 'Ombro'] },
    ],
  },
];

function quickToWorkoutDay(q: QuickWorkout): WorkoutDay {
  return { dayOfWeek: 'Hoje', focus: q.name, duration: q.duration, exercises: q.exercises };
}

function fmtHistoryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}min` : `${s}s`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Home'> };

export function HomeScreen({ navigation }: Props) {
  const { plan, loadStoredPlan, clearPlan } = usePlan();
  const [recentWorkouts, setRecentWorkouts] = useState<CompletedWorkout[]>([]);
  const hr = useHeartRate();
  const carousel = useCarouselCustomization(QUICK_WORKOUTS);
  // id of the workout whose exercises are being customised (null = modal closed)
  const [customiseId, setCustomiseId] = useState<string | null>(null);

  const reloadHistory = useCallback(async () => {
    const hist = await loadHistory();
    setRecentWorkouts(hist.slice(0, 3));
  }, []);

  useEffect(() => {
    loadStoredPlan();
    AsyncStorage.getItem(CUSTOM_KEY_STORAGE).then((k) => { if (k) setRuntimeApiKey(k); });
    reloadHistory();
  }, []);

  const handleClearPlan = () => {
    Alert.alert('Novo Plano', 'Seu plano atual será apagado. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar e recomeçar', style: 'destructive',
        onPress: async () => { await clearPlan(); navigation.replace('Onboarding'); } },
    ]);
  };

  if (!plan) {
    return (
      <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
        <View style={s.emptyWrap}>
          <Text style={s.emptyEmoji}>🏋️</Text>
          <Text style={s.emptyTitle}>Nenhum plano encontrado</Text>
          <Text style={s.emptyDesc}>Crie seu plano anual personalizado com IA</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.replace('Onboarding')}>
            <Text style={s.emptyBtnText}>Criar Plano Agora</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { userProfile: p, monthlyBlocks, overallGoal, nutritionTips, recoveryTips } = plan;
  const goal = GOAL_META[p.goal] ?? { icon: '🎯', label: p.goal };
  const generatedCount = monthlyBlocks.filter((b) => b.weeks.length > 0).length;
  const progress = generatedCount / 12;

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <View>
          <Text style={s.greeting}>{greeting()}, {p.name} 👋</Text>
          <Text style={s.greetingSub}>Seu plano de 12 meses está ativo</Text>
        </View>
        <View style={s.topBarActions}>
          {/* Heart-rate badge */}
          <TouchableOpacity
            style={[s.hrBadge, hr.status === 'connected' && { borderColor: hrZoneColor(hr.bpm) }]}
            onPress={() => hr.status === 'connected' ? hr.disconnect() : hr.connect()}
            testID="btn-heartrate"
          >
            <Text style={s.hrBadgeIcon}>❤️</Text>
            {hr.status === 'connected' && hr.bpm !== null ? (
              <Text style={[s.hrBadgeBpm, { color: hrZoneColor(hr.bpm) }]}>{hr.bpm}</Text>
            ) : (
              <Text style={s.hrBadgeIdle}>
                {hr.status === 'scanning' || hr.status === 'connecting' ? '…' : '—'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Settings')} testID="btn-settings">
            <Text style={s.iconBtnText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('MuscleFatigue')} testID="btn-muscle-fatigue">
            <Text style={s.iconBtnText}>🧍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Hero goal card ── */}
      <View style={s.heroCard}>
        <View style={s.heroTop}>
          <Text style={s.heroEmoji}>{goal.icon}</Text>
          <View style={s.heroInfo}>
            <Text style={s.heroLabel}>OBJETIVO</Text>
            <Text style={s.heroGoal}>{goal.label}</Text>
          </View>
          <TouchableOpacity style={s.newPlanBtn} onPress={handleClearPlan}>
            <Text style={s.newPlanText}>Reiniciar</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.heroDesc} numberOfLines={2}>{overallGoal}</Text>

        {/* Progress bar */}
        <View style={s.progressSection}>
          <View style={s.progressHeader}>
            <Text style={s.progressLabel}>Meses com treinos detalhados</Text>
            <Text style={s.progressCount}>{generatedCount}/12</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View style={s.statsRow}>
        {[
          { icon: '📅', value: `${p.daysPerWeek}×`, label: 'por semana' },
          { icon: '📆', value: '12',               label: 'meses' },
          { icon: '🏆', value: `${p.daysPerWeek * 48}`, label: 'treinos' },
        ].map((stat, i) => (
          <View key={i} style={s.statCard}>
            <Text style={s.statIcon}>{stat.icon}</Text>
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Chat CTA ── */}
      <TouchableOpacity style={s.chatCard} onPress={() => navigation.navigate('Chat')} activeOpacity={0.85}>
        <View style={s.chatAvatarWrap}>
          <Text style={s.chatAvatar}>🤖</Text>
        </View>
        <View style={s.chatInfo}>
          <Text style={s.chatTitle}>Coach IA</Text>
          <Text style={s.chatSub}>Tire dúvidas, ajuste o plano, peça treinos extras</Text>
        </View>
        <View style={s.chatArrowWrap}>
          <Text style={s.chatArrow}>›</Text>
        </View>
      </TouchableOpacity>

      {/* ── Quick workouts ── */}
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>⚡ Treinos Rápidos</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickScroll} contentContainerStyle={s.quickContent}>
        {QUICK_WORKOUTS.map((q) => {
          const customised = carousel.buildCustomWorkout(q);
          const enabledCount = carousel.getEnabledIndices(q.id, q.exercises.length).size;
          return (
            <TouchableOpacity
              key={q.id}
              style={[s.quickCard, { borderColor: `${q.color}40` }]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('ActiveWorkout', { workout: quickToWorkoutDay(customised) })}
              onLongPress={() => setCustomiseId(q.id)}
            >
              <View style={[s.quickIconWrap, { backgroundColor: `${q.color}20` }]}>
                <Text style={s.quickIcon}>{q.icon}</Text>
              </View>
              <View style={[s.quickTag, { backgroundColor: `${q.color}18` }]}>
                <Text style={[s.quickTagText, { color: q.color }]}>{q.tag}</Text>
              </View>
              <Text style={s.quickName}>{q.name}</Text>
              <Text style={s.quickDesc} numberOfLines={2}>{q.description}</Text>
              <View style={s.quickFooter}>
                <Text style={[s.quickDuration, { color: q.color }]}>⏱ {q.duration} min</Text>
                <TouchableOpacity
                  style={s.quickCustomBtn}
                  onPress={() => setCustomiseId(q.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={s.quickCustomBtnText}>
                    {enabledCount}/{q.exercises.length} ✎
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Carousel customisation modal ── */}
      {customiseId !== null && (() => {
        const wk = QUICK_WORKOUTS.find(w => w.id === customiseId);
        if (!wk) return null;
        const enabled = carousel.getEnabledIndices(wk.id, wk.exercises.length);
        const selectedGroup = carousel.getMuscleGroupFilter(wk.id);
        const muscleGroups = Array.from(new Set(wk.exercises.flatMap(ex => ex.muscleGroups ?? [])));
        return (
          <Modal visible transparent animationType="slide" onRequestClose={() => setCustomiseId(null)}>
            <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setCustomiseId(null)}>
              <View style={s.customiseSheet} onStartShouldSetResponder={() => true}>
                <Text style={s.customiseTitle}>{wk.icon} {wk.name}</Text>
                <Text style={s.customiseSubtitle}>Toque para ativar/desativar exercícios</Text>
                {muscleGroups.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.groupChipRow}>
                    <TouchableOpacity
                      style={[s.groupChip, selectedGroup === null && s.groupChipActive]}
                      onPress={() => carousel.setMuscleGroupFilter(wk, null)}
                    >
                      <Text style={[s.groupChipText, selectedGroup === null && s.groupChipTextActive]}>Todos</Text>
                    </TouchableOpacity>
                    {muscleGroups.map((group) => (
                      <TouchableOpacity
                        key={group}
                        style={[s.groupChip, selectedGroup === group && s.groupChipActive]}
                        onPress={() => carousel.setMuscleGroupFilter(wk, group)}
                      >
                        <Text style={[s.groupChipText, selectedGroup === group && s.groupChipTextActive]}>{group}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                {wk.exercises.map((ex, idx) => {
                  const on = enabled.has(idx);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[s.customiseRow, on && s.customiseRowOn]}
                      onPress={() => carousel.toggleExercise(wk.id, idx, wk.exercises.length)}
                    >
                      <View style={[s.customiseCheck, on && { backgroundColor: wk.color }]}>
                        <Text style={s.customiseCheckText}>{on ? '✓' : ''}</Text>
                      </View>
                      <View style={s.customiseExInfo}>
                        <Text style={[s.customiseExName, !on && { color: C.text3 }]}>{ex.name}</Text>
                        <Text style={s.customiseExMeta}>
                          {ex.sets}×{ex.reps}
                          {ex.muscleGroups?.length ? ` · ${ex.muscleGroups.join(' / ')}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <View style={s.customiseBtns}>
                  <TouchableOpacity style={s.customiseReset} onPress={() => carousel.resetSelection(wk.id)}>
                    <Text style={s.customiseResetText}>Restaurar padrão</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.customiseDone} onPress={() => setCustomiseId(null)}>
                    <Text style={s.customiseDoneText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        );
      })()}

      {/* ── Recent history ── */}
      <View style={s.historyHeader}>
        <Text style={s.sectionTitle}>📋 Histórico Recente</Text>
        <View style={s.historyHeaderRight}>
          <TouchableOpacity
            onPress={async () => {
              try {
                const allWorkouts = await loadHistory();
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                const weekWorkouts = allWorkouts.filter(w => new Date(w.date) >= weekAgo);
                const cardData = buildWeeklyCardData(weekWorkouts, hr.bpm);
                await shareWeeklyCard(cardData);
              } catch {
                Alert.alert('Compartilhar', 'Não foi possível compartilhar o resumo semanal.');
              }
            }}
          >
            <Text style={s.shareLink}>📤 Semana</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('WorkoutHistory')}>
            <Text style={s.historyLink}>Ver tudo ›</Text>
          </TouchableOpacity>
        </View>
      </View>
      {recentWorkouts.length === 0 ? (
        <View style={s.historyEmpty}>
          <Text style={s.historyEmptyText}>Nenhum treino registrado ainda. Complete um treino para ver aqui!</Text>
        </View>
      ) : (
        recentWorkouts.map((w) => {
          const doneSets = w.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
          return (
            <View key={w.id} style={s.historyCard}>
              <View style={s.historyCardLeft}>
                <Text style={s.historyCardDate}>{fmtHistoryDate(w.date)}</Text>
                <Text style={s.historyCardFocus}>{w.focus}</Text>
              </View>
              <View style={s.historyCardRight}>
                <Text style={s.historyCardDur}>{fmtDuration(w.durationSeconds)}</Text>
                <Text style={s.historyCardSets}>{doneSets} séries</Text>
              </View>
            </View>
          );
        })
      )}

      {/* ── Month grid ── */}
      <Text style={[s.sectionTitle, { marginTop: 8 }]}>📅 Plano Anual</Text>
      <View style={s.monthGrid}>
        {monthlyBlocks.map((month, idx) => {
          const ph = PHASE(idx);
          const hasWeeks = month.weeks.length > 0;
          const isCurrent = idx === new Date().getMonth();
          return (
            <TouchableOpacity
              key={idx}
              style={[s.monthCell, isCurrent && { borderColor: C.primary, borderWidth: 2 }]}
              onPress={() => navigation.navigate('MonthDetail', { monthIndex: idx })}
              activeOpacity={0.75}
            >
              {/* Phase accent bar */}
              <View style={[s.phaseBar, { backgroundColor: ph.color }]} />

              <Text style={[s.monthNum, { color: ph.color }]}>{MONTH_ABBR[idx]}</Text>
              <Text style={s.monthFocus} numberOfLines={1}>{month.focus}</Text>

              <View style={[s.monthStatus, hasWeeks ? { backgroundColor: C.successBg } : { backgroundColor: C.elevated }]}>
                <Text style={[s.monthStatusText, hasWeeks ? { color: C.success } : { color: C.text3 }]}>
                  {hasWeeks ? '✓' : isCurrent ? '▶' : '○'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Phase legend ── */}
      <View style={s.legendRow}>
        {[
          { color: '#10B981', label: 'Base (1-3)' },
          { color: '#3B82F6', label: 'Evolução (4-6)' },
          { color: '#F59E0B', label: 'Intensidade (7-9)' },
          { color: '#EF4444', label: 'Pico (10-12)' },
        ].map((l, i) => (
          <View key={i} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: l.color }]} />
            <Text style={s.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Nutrition tips ── */}
      {nutritionTips.length > 0 && (
        <>
          <Text style={s.sectionTitle}>🥗 Nutrição</Text>
          <View style={s.tipsCard}>
            {nutritionTips.map((tip, i) => (
              <View key={i} style={s.tipRow}>
                <View style={s.tipDot} />
                <Text style={s.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Recovery tips ── */}
      {recoveryTips.length > 0 && (
        <>
          <Text style={s.sectionTitle}>😴 Recuperação</Text>
          <View style={s.tipsCard}>
            {recoveryTips.map((tip, i) => (
              <View key={i} style={s.tipRow}>
                <View style={s.tipDot} />
                <Text style={s.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 16 },

  // Empty state
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 72, marginBottom: 8 },
  emptyTitle: { color: C.text1, fontSize: 22, fontWeight: '800' },
  emptyDesc: { color: C.text2, fontSize: 15, textAlign: 'center' },
  emptyBtn: { marginTop: 8, backgroundColor: C.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Top bar
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8, marginBottom: 16 },
  greeting: { color: C.text1, fontSize: 20, fontWeight: '800' },
  greetingSub: { color: C.text3, fontSize: 12, marginTop: 2 },
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  iconBtnText: { fontSize: 18 },

  // Hero card
  heroCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  heroEmoji: { fontSize: 42, marginRight: 14 },
  heroInfo: { flex: 1 },
  heroLabel: { color: C.primaryLight, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  heroGoal: { color: C.text1, fontSize: 17, fontWeight: '800', marginTop: 2 },
  newPlanBtn: { backgroundColor: C.elevated, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  newPlanText: { color: C.text2, fontSize: 12 },
  heroDesc: { color: C.text2, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  progressSection: { gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: C.text3, fontSize: 12 },
  progressCount: { color: C.primaryLight, fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: C.elevated, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: C.primary, borderRadius: 3 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { color: C.primary, fontSize: 22, fontWeight: '900' },
  statLabel: { color: C.text3, fontSize: 11, marginTop: 2 },

  // Chat CTA
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)',
    gap: 12,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  chatAvatarWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  chatAvatar: { fontSize: 26 },
  chatInfo: { flex: 1 },
  chatTitle: { color: C.text1, fontWeight: '800', fontSize: 15 },
  chatSub: { color: C.primaryLight, fontSize: 12, marginTop: 2 },
  chatArrowWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  chatArrow: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Section
  sectionTitle: { color: C.text1, fontSize: 16, fontWeight: '800', marginBottom: 12 },

  // Month grid
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  monthCell: {
    width: CARD_WIDTH,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 80,
    justifyContent: 'space-between',
  },
  phaseBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  monthNum: { fontSize: 13, fontWeight: '800', marginTop: 6 },
  monthFocus: { color: C.text3, fontSize: 9, textAlign: 'center', marginTop: 2 },
  monthStatus: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  monthStatusText: { fontSize: 11, fontWeight: '700' },

  // Legend
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: C.text3, fontSize: 11 },

  // Tips
  tipsCard: { backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border, gap: 10 },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginTop: 6, flexShrink: 0 },
  tipText: { color: C.text2, fontSize: 14, lineHeight: 20, flex: 1 },

  // Quick workouts
  quickScroll: { marginHorizontal: -16, marginBottom: 20 },
  quickContent: { paddingHorizontal: 16, gap: 10 },
  quickCard: {
    width: 150, backgroundColor: C.surface, borderRadius: 16,
    padding: 14, borderWidth: 1, gap: 6,
  },
  quickIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  quickIcon: { fontSize: 22 },
  quickTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  quickTagText: { fontSize: 10, fontWeight: '700' },
  quickName: { color: C.text1, fontSize: 14, fontWeight: '800' },
  quickDesc: { color: C.text3, fontSize: 11, lineHeight: 15 },
  quickDuration: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  quickFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  quickCustomBtn: { backgroundColor: C.elevated, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  quickCustomBtnText: { color: C.text3, fontSize: 10 },

  // Section header row
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  // Heart rate badge (top bar)
  topBarActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  hrBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: C.border,
  },
  hrBadgeIcon: { fontSize: 14 },
  hrBadgeBpm: { fontSize: 13, fontWeight: '700' },
  hrBadgeIdle: { color: C.text3, fontSize: 13 },

  // History preview
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyHeaderRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  historyLink: { color: C.primaryLight, fontSize: 13, fontWeight: '700' },
  shareLink: { color: C.success, fontSize: 13, fontWeight: '700' },
  historyEmpty: { backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  historyEmptyText: { color: C.text3, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  historyCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  historyCardLeft: { flex: 1 },
  historyCardDate: { color: C.text3, fontSize: 11 },
  historyCardFocus: { color: C.text1, fontSize: 15, fontWeight: '700', marginTop: 2 },
  historyCardRight: { alignItems: 'flex-end' },
  historyCardDur: { color: C.primaryLight, fontSize: 13, fontWeight: '700' },
  historyCardSets: { color: C.text3, fontSize: 11, marginTop: 2 },

  // Carousel customise modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  customiseSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 12,
    borderTopWidth: 1, borderColor: C.border,
  },
  customiseTitle: { color: C.text1, fontSize: 18, fontWeight: '800' },
  customiseSubtitle: { color: C.text3, fontSize: 13, marginBottom: 4 },
  groupChipRow: { gap: 8, paddingVertical: 2, marginBottom: 8 },
  groupChip: {
    backgroundColor: C.elevated,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  groupChipActive: { borderColor: C.primary, backgroundColor: C.primaryGlow },
  groupChipText: { color: C.text2, fontSize: 12, fontWeight: '600' },
  groupChipTextActive: { color: C.primaryLight },
  customiseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.elevated, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border,
  },
  customiseRowOn: { borderColor: 'rgba(124,58,237,0.4)' },
  customiseCheck: {
    width: 24, height: 24, borderRadius: 6, backgroundColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  customiseCheckText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  customiseExInfo: { flex: 1 },
  customiseExName: { color: C.text1, fontSize: 14, fontWeight: '600' },
  customiseExMeta: { color: C.text3, fontSize: 12, marginTop: 2 },
  customiseBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  customiseReset: { flex: 1, backgroundColor: C.elevated, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  customiseResetText: { color: C.text2, fontSize: 14, fontWeight: '600' },
  customiseDone: { flex: 1, backgroundColor: C.primary, borderRadius: 12, padding: 12, alignItems: 'center' },
  customiseDoneText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
