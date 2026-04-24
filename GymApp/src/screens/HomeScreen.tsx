import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, Dimensions, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, QuickWorkout, WorkoutDay, CompletedWorkout } from '../types';
import { usePlan } from '../hooks/usePlan';
import { setRuntimeApiKey, getDailySuggestion, generateCustomWorkout, DailySuggestion } from '../services/aiService';
import { loadHistory } from '../services/workoutHistoryService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 3;

const CUSTOM_KEY_STORAGE = '@gymapp_custom_apikey';
const ACTIVE_WORKOUT_SESSION_KEY = '@gymapp_active_workout_session';

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
    muscleGroups: ['Quadríceps', 'Glúteo', 'Abdômen'],
    exercises: [
      { name: 'Burpee',           sets: 4, reps: '10',  rest: '30s' },
      { name: 'Mountain Climber', sets: 4, reps: '30s', rest: '20s' },
      { name: 'Jump Squat',       sets: 3, reps: '15',  rest: '30s' },
      { name: 'High Knees',       sets: 3, reps: '30s', rest: '20s' },
    ],
  },
  {
    id: 'biset', name: 'Biset Força', icon: '🏋️', duration: 35,
    color: '#7C3AED', description: 'Empurrar + Puxar em biset', tag: 'Biset',
    muscleGroups: ['Peito', 'Costas', 'Ombro'],
    exercises: [
      { name: 'Supino Reto',       sets: 4, reps: '10', rest: '60s', notes: 'Biset c/ Remada' },
      { name: 'Remada Curvada',    sets: 4, reps: '10', rest: '60s', notes: 'Biset c/ Supino' },
      { name: 'Desenvolvimento',   sets: 3, reps: '12', rest: '60s', notes: 'Biset c/ Puxada' },
      { name: 'Puxada Frontal',    sets: 3, reps: '12', rest: '60s', notes: 'Biset c/ Desenvolvimento' },
    ],
  },
  {
    id: 'pyramid', name: 'Pirâmide', icon: '📈', duration: 40,
    color: '#F59E0B', description: 'Progride a carga a cada série', tag: 'Pirâmide',
    muscleGroups: ['Quadríceps', 'Glúteo', 'Posterior'],
    exercises: [
      { name: 'Agachamento Livre', sets: 5, reps: '15/12/10/8/6', rest: '90s', notes: 'Aumente a carga a cada série' },
      { name: 'Leg Press',         sets: 4, reps: '15/12/10/8',   rest: '75s', notes: 'Pirâmide crescente' },
      { name: 'Cadeira Extensora', sets: 3, reps: '15/12/10',     rest: '60s', notes: 'Finalizador' },
    ],
  },
  {
    id: 'dropset', name: 'Dropset', icon: '📉', duration: 30,
    color: '#10B981', description: 'Reduza a carga sem parar', tag: 'Dropset',
    muscleGroups: ['Bíceps', 'Tríceps', 'Ombro'],
    exercises: [
      { name: 'Rosca Direta',     sets: 3, reps: '12+drop', rest: '90s', notes: 'Dropset: tire 20% da carga e continue' },
      { name: 'Tríceps Pulley',   sets: 3, reps: '12+drop', rest: '90s', notes: 'Dropset no mesmo cabo' },
      { name: 'Elevação Lateral', sets: 3, reps: '15+drop', rest: '75s', notes: 'Dropset com halter' },
    ],
  },
  {
    id: 'crossfit', name: 'CrossFit WOD', icon: '🏅', duration: 25,
    color: '#3B82F6', description: 'Condicionamento funcional intenso', tag: 'Funcional',
    muscleGroups: ['Quadríceps', 'Costas', 'Ombro'],
    exercises: [
      { name: 'Thruster (barra)',  sets: 5, reps: '10', rest: '45s' },
      { name: 'Pull-up',          sets: 5, reps: '8',  rest: '45s' },
      { name: 'Box Jump',         sets: 4, reps: '12', rest: '30s' },
      { name: 'Kettlebell Swing', sets: 4, reps: '15', rest: '30s' },
    ],
  },
  {
    id: 'triset', name: 'Triset Core', icon: '🔥', duration: 20,
    color: '#EC4899', description: 'Triset para abdômen e core', tag: 'Triset',
    muscleGroups: ['Abdômen'],
    exercises: [
      { name: 'Prancha',        sets: 4, reps: '45s', rest: '0s',  notes: 'Triset 1/3' },
      { name: 'Abdominal Bici', sets: 4, reps: '20',  rest: '0s',  notes: 'Triset 2/3' },
      { name: 'Russian Twist',  sets: 4, reps: '20',  rest: '60s', notes: 'Triset 3/3 — descanse aqui' },
    ],
  },
  {
    id: 'mobility', name: 'Mobilidade', icon: '🧘', duration: 30,
    color: '#06B6D4', description: 'Alongamento + yoga dinâmica', tag: 'Mobilidade',
    muscleGroups: ['Posterior', 'Quadríceps', 'Ombro'],
    exercises: [
      { name: 'Alongamento Isquiotibiais', sets: 3, reps: '45s', rest: '15s' },
      { name: 'Yoga: Cão Olhando p/ Baixo', sets: 3, reps: '45s', rest: '15s' },
      { name: 'Hip Flexor Stretch',         sets: 3, reps: '45s', rest: '15s' },
      { name: 'Abertura de Quadril (Pombo)', sets: 2, reps: '60s', rest: '20s' },
      { name: 'Rotação de Ombro',           sets: 3, reps: '30s', rest: '15s' },
      { name: 'Cat-Cow (Gato/Vaca)',        sets: 3, reps: '45s', rest: '10s' },
    ],
  },
];

const ALL_MUSCLE_GROUPS = ['Todos', 'Peito', 'Costas', 'Ombro', 'Bíceps', 'Tríceps', 'Quadríceps', 'Posterior', 'Glúteo', 'Abdômen', 'Mobilidade'];

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

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Main'> };

const DAY_MAP: Record<number, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta',
  4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
};

export function HomeScreen({ navigation }: Props) {
  const { plan, loadStoredPlan, clearPlan } = usePlan();
  const [recentWorkouts, setRecentWorkouts] = useState<CompletedWorkout[]>([]);
  const [allHistory, setAllHistory] = useState<CompletedWorkout[]>([]);
  const [quickFilter, setQuickFilter] = useState('Todos');
  const [dailySuggestion, setDailySuggestion] = useState<DailySuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [custGroups, setCustGroups] = useState<string[]>([]);
  const [custStrategy, setCustStrategy] = useState('');
  const [custDuration, setCustDuration] = useState(30);
  const [custEquipment, setCustEquipment] = useState('academia');
  const [custLoading, setCustLoading] = useState(false);
  const [custWorkout, setCustWorkout] = useState<WorkoutDay | null>(null);
  const [resumeWorkout, setResumeWorkout] = useState<WorkoutDay | null>(null);
  const [resumeContext, setResumeContext] = useState<{ monthIndex: number; weekIndex: number; dayIndex: number } | undefined>(undefined);

  const reloadHistory = useCallback(async () => {
    const hist = await loadHistory();
    setRecentWorkouts(hist.slice(0, 3));
    setAllHistory(hist);
  }, []);

  useEffect(() => {
    loadStoredPlan();
    AsyncStorage.getItem(CUSTOM_KEY_STORAGE).then((k) => { if (k) setRuntimeApiKey(k); });
    reloadHistory();
  }, []);

  // Re-check the active session and reload history every time the screen gains
  // focus so the "resume session" card appears / disappears correctly when the
  // user navigates back from another screen.
  useFocusEffect(
    useCallback(() => {
      reloadHistory();
      const clearResume = () => { setResumeWorkout(null); setResumeContext(undefined); };
      AsyncStorage.getItem(ACTIVE_WORKOUT_SESSION_KEY).then((raw) => {
        if (!raw) { clearResume(); return; }
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.workout?.focus && Array.isArray(parsed?.workout?.exercises)) {
            setResumeWorkout(parsed.workout);
            setResumeContext(parsed.context);
          } else {
            clearResume();
          }
        } catch {
          clearResume();
        }
      });
    }, [reloadHistory]),
  );

  useEffect(() => {
    if (!plan) return;
    setLoadingSuggestion(true);
    getDailySuggestion(recentWorkouts, plan.userProfile)
      .then(setDailySuggestion)
      .catch(() => {})
      .finally(() => setLoadingSuggestion(false));
  }, [plan]);

  const handleGenerateCustom = async () => {
    if (custGroups.length === 0) {
      Alert.alert('Selecione pelo menos um grupo muscular');
      return;
    }
    setCustLoading(true);
    try {
      const w = await generateCustomWorkout({
        muscleGroups: custGroups,
        strategy: custStrategy || 'Normal',
        duration: custDuration,
        equipment: custEquipment,
        profile: plan!.userProfile,
      });
      setCustWorkout(w);
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o treino. Verifique sua conexão.');
    } finally {
      setCustLoading(false);
    }
  };

  const handleClearPlan = () => {
    Alert.alert('Novo Plano', 'Seu plano atual será apagado. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar e recomeçar', style: 'destructive',
        onPress: async () => { await clearPlan(); navigation.replace('NewPlan'); } },
    ]);
  };

  const navigateToWorkout = useCallback(async (
    workout: WorkoutDay,
    context?: { monthIndex: number; weekIndex: number; dayIndex: number },
  ) => {
    const raw = await AsyncStorage.getItem(ACTIVE_WORKOUT_SESSION_KEY);
    if (!raw) {
      navigation.navigate('ActiveWorkout', { workout, context });
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.workout?.focus) {
        navigation.navigate('ActiveWorkout', { workout, context });
        return;
      }
      // Same workout — just resume it
      if (parsed.workout.focus === workout.focus) {
        navigation.navigate('ActiveWorkout', { workout, context });
        return;
      }
      Alert.alert(
        'Treino em Andamento',
        `Você tem um treino em andamento: "${parsed.workout.focus}". O que deseja fazer?`,
        [
          {
            text: 'Cancelar treino anterior',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.removeItem(ACTIVE_WORKOUT_SESSION_KEY);
              setResumeWorkout(null);
              setResumeContext(undefined);
              navigation.navigate('ActiveWorkout', { workout, context });
            },
          },
          {
            text: 'Retomar treino anterior',
            onPress: () => {
              navigation.navigate('ActiveWorkout', { workout: parsed.workout, context: parsed.context });
            },
          },
          { text: 'Voltar', style: 'cancel' },
        ],
      );
    } catch {
      navigation.navigate('ActiveWorkout', { workout, context });
    }
  }, [navigation]);

  if (!plan) {
    return (
      <SafeAreaView style={s.safeArea} edges={['top']}>
        <View style={s.emptyWrap}>
          <Text style={s.emptyEmoji}>🏋️</Text>
          <Text style={s.emptyTitle}>Nenhum plano encontrado</Text>
          <Text style={s.emptyDesc}>Crie seu plano anual personalizado com IA</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.replace('NewPlan')}>
            <Text style={s.emptyBtnText}>Criar Plano Agora</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { userProfile: p, monthlyBlocks, overallGoal, nutritionTips, recoveryTips } = plan;
  const goal = GOAL_META[p.goal] ?? { icon: '🎯', label: p.goal };
  const totalMonths = plan.totalMonths ?? monthlyBlocks.length ?? 12;
  const generatedCount = monthlyBlocks.filter((b) => b.weeks.length > 0).length;
  const progress = generatedCount / totalMonths;

  // Calculate current month index based on plan.createdAt
  const planStartDate = new Date(plan.createdAt);
  const now = new Date();
  const monthsElapsed = (now.getFullYear() - planStartDate.getFullYear()) * 12 + (now.getMonth() - planStartDate.getMonth());
  const currentMonthIndex = Math.min(Math.max(0, monthsElapsed), totalMonths - 1);
  // Real calendar month for index 0 is plan's start month
  const startMonth = planStartDate.getMonth(); // 0-11

  // Calculate plan sessions progress
  const completedPlanSessions = allHistory.filter(w => w.monthIndex !== undefined).length;
  const totalPlanSessions = monthlyBlocks.reduce((total, block) =>
    total + block.weeks.reduce((wTotal, week) => wTotal + week.days.length, 0), 0);
  const remainingSessions = Math.max(0, totalPlanSessions - completedPlanSessions);
  const remainingLabel = totalPlanSessions === 0 ? '—' : String(remainingSessions);

  // Find today's workout from plan
  const todayDOW = DAY_MAP[now.getDay()];
  let todayWorkout: WorkoutDay | null = null;
  let todayContext: { monthIndex: number; weekIndex: number; dayIndex: number } | undefined;
  const curMonth = monthlyBlocks[currentMonthIndex];
  if (curMonth?.weeks?.length) {
    const weeksElapsed = Math.floor((now.getTime() - planStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) % curMonth.weeks.length;
    const weekIdx = Math.min(Math.max(0, weeksElapsed), curMonth.weeks.length - 1);
    const curWeek = curMonth.weeks[weekIdx];
    if (curWeek?.days) {
      const dayIdx = curWeek.days.findIndex(d => d.dayOfWeek === todayDOW);
      if (dayIdx >= 0) {
        todayWorkout = curWeek.days[dayIdx];
        todayContext = { monthIndex: currentMonthIndex, weekIndex: weekIdx, dayIndex: dayIdx };
      }
    }
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <View>
          <Text style={s.greeting}>{greeting()}, {p.name} 👋</Text>
          <Text style={s.greetingSub}>Seu plano de {totalMonths} {totalMonths === 1 ? 'mês' : 'meses'} está ativo</Text>
        </View>
      </View>

      {/* ── Acessar seu treino ── */}
      <TouchableOpacity
        style={s.todayBtn}
        activeOpacity={0.85}
        onPress={() => {
          const w = todayWorkout ?? dailySuggestion?.workout ?? null;
          const ctx = todayContext;
          if (w) navigateToWorkout(w, ctx);
          else Alert.alert('Treino do dia', 'Nenhum treino encontrado para hoje. Tente um treino rápido!');
        }}
      >
        <Text style={s.todayBtnText}>▶  Acessar Seu Treino de Hoje</Text>
        {todayWorkout && <Text style={s.todayBtnSub}>{todayWorkout.focus}</Text>}
      </TouchableOpacity>

      {/* ── Acessar plano de treinos ── */}
      <TouchableOpacity
        style={s.planBtn}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('MonthDetail', { monthIndex: currentMonthIndex })}
      >
        <Text style={s.planBtnText}>📅  Acessar Seu Plano de Treinos</Text>
        <Text style={s.planBtnSub}>{MONTH_ABBR[(startMonth + currentMonthIndex) % 12]} · Mês {currentMonthIndex + 1} de {monthlyBlocks.length}</Text>
      </TouchableOpacity>

      {/* ── Performance Analysis button ── */}
      <TouchableOpacity style={s.exportBtn} onPress={() => navigation.navigate('PerformanceAnalysis')}>
        <Text style={s.exportBtnText}>📊 Analisar Desempenho</Text>
      </TouchableOpacity>

      {/* ── Hero goal card ── */}
      <View style={s.heroCard}>
        <View style={s.heroTop}>
          <Text style={s.heroEmoji}>{goal.icon}</Text>
          <View style={s.heroInfo}>
            <Text style={s.heroLabel}>OBJETIVO</Text>
            <Text style={s.heroGoal}>{goal.label}</Text>
          </View>
          <TouchableOpacity style={s.newPlanBtn} onPress={handleClearPlan}>
            <Text style={s.newPlanText}>Novo Plano</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.heroDesc} numberOfLines={2}>{overallGoal}</Text>

        {/* Progress bar */}
        <View style={s.progressSection}>
          <View style={s.progressHeader}>
            <Text style={s.progressLabel}>Meses com treinos detalhados</Text>
            <Text style={s.progressCount}>{generatedCount}/{totalMonths}</Text>
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
          { icon: '✅', value: String(completedPlanSessions), label: 'realizados' },
          { icon: '📌', value: remainingLabel, label: 'restantes' },
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

      {resumeWorkout ? (
        <TouchableOpacity
          style={s.resumeCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ActiveWorkout', { workout: resumeWorkout, context: resumeContext })}
        >
          <Text style={s.resumeIcon}>🔄</Text>
          <View style={s.resumeInfo}>
            <Text style={s.resumeTitle}>Retomar sessão em andamento</Text>
            <Text style={s.resumeSub}>{resumeWorkout.focus} · {resumeWorkout.exercises.length} exercícios</Text>
          </View>
          <Text style={s.resumeArrow}>›</Text>
        </TouchableOpacity>
      ) : null}

      {/* ── Daily suggestion ── */}
      {(loadingSuggestion || dailySuggestion) && (
        <View style={s.suggestionCard}>
          {loadingSuggestion ? (
            <View style={s.suggestionLoading}>
              <ActivityIndicator color={C.primaryLight} size="small" />
              <Text style={s.suggestionLoadingText}>Buscando sugestão do dia…</Text>
            </View>
          ) : dailySuggestion ? (
            <>
              <View style={s.suggestionHeader}>
                <Text style={s.suggestionIcon}>{dailySuggestion.icon}</Text>
                <View style={s.suggestionHeaderText}>
                  <Text style={s.suggestionLabel}>SUGESTÃO DO DIA</Text>
                  <Text style={s.suggestionTitle}>{dailySuggestion.title}</Text>
                </View>
              </View>
              <Text style={s.suggestionReason}>{dailySuggestion.reason}</Text>
              <TouchableOpacity
                style={s.suggestionBtn}
                onPress={() => navigateToWorkout(dailySuggestion.workout)}
              >
                <Text style={s.suggestionBtnText}>▶  Iniciar Agora</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      )}

      {/* ── Quick workouts ── */}
      <View style={s.quickHeader}>
        <Text style={[s.sectionTitle, { marginBottom: 0 }]}>⚡ Treinos Rápidos</Text>
        <TouchableOpacity
          style={s.customizerBtn}
          onPress={() => { setCustWorkout(null); setCustGroups([]); setCustStrategy(''); setCustDuration(30); setCustEquipment('academia'); setShowCustomizer(true); }}
        >
          <Text style={s.customizerBtnText}>+ Personalizar</Text>
        </TouchableOpacity>
      </View>
      {/* Muscle group filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
        {ALL_MUSCLE_GROUPS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[s.filterChip, quickFilter === g && s.filterChipActive]}
            onPress={() => setQuickFilter(g)}
          >
            <Text style={[s.filterChipText, quickFilter === g && s.filterChipTextActive]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickScroll} contentContainerStyle={s.quickContent}>
        {QUICK_WORKOUTS.filter(q =>
          quickFilter === 'Todos' || q.muscleGroups.includes(quickFilter) || (quickFilter === 'Mobilidade' && q.id === 'mobility')
        ).map((q) => (
          <TouchableOpacity
            key={q.id}
            style={[s.quickCard, { borderColor: `${q.color}40` }]}
            activeOpacity={0.82}
            onPress={() => navigateToWorkout(quickToWorkoutDay(q))}
          >
            <View style={[s.quickIconWrap, { backgroundColor: `${q.color}20` }]}>
              <Text style={s.quickIcon}>{q.icon}</Text>
            </View>
            <View style={[s.quickTag, { backgroundColor: `${q.color}18` }]}>
              <Text style={[s.quickTagText, { color: q.color }]}>{q.tag}</Text>
            </View>
            <Text style={s.quickName}>{q.name}</Text>
            <Text style={s.quickDesc} numberOfLines={2}>{q.description}</Text>
            <Text style={[s.quickDuration, { color: q.color }]}>⏱ {q.duration} min</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Recent history ── */}
      <View style={s.historyHeader}>
        <Text style={s.sectionTitle}>📋 Histórico Recente</Text>
        <TouchableOpacity onPress={() => navigation.navigate('WorkoutHistory')}>
          <Text style={s.historyLink}>Ver tudo ›</Text>
        </TouchableOpacity>
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

      <TouchableOpacity style={s.recordsCard} onPress={() => navigation.navigate('WorkoutHistory')} activeOpacity={0.82}>
        <Text style={s.recordsIcon}>🏆</Text>
        <View style={s.recordsInfo}>
          <Text style={s.recordsTitle}>Recordes Pessoais</Text>
          <Text style={s.recordsSub}>A seção de recordes fica no Histórico de Treinos</Text>
        </View>
        <Text style={s.recordsArrow}>›</Text>
      </TouchableOpacity>

      {/* ── Muscle fatigue link ── */}
      <TouchableOpacity style={s.fatigueCard} onPress={() => navigation.navigate('MuscleFatigue')} activeOpacity={0.82}>
        <Text style={s.fatigueIcon}>🔥</Text>
        <View style={s.fatigueInfo}>
          <Text style={s.fatigueTitle}>Fadiga Muscular</Text>
          <Text style={s.fatigueSub}>Veja quais músculos precisam de descanso</Text>
        </View>
        <Text style={s.fatigueArrow}>›</Text>
      </TouchableOpacity>

      {/* ── Month grid ── */}
      <Text style={[s.sectionTitle, { marginTop: 8 }]}>📅 Plano de {totalMonths} {totalMonths === 1 ? 'Mês' : 'Meses'}</Text>
      <View style={s.monthGrid}>
        {monthlyBlocks.map((month, idx) => {
          const ph = PHASE(idx);
          const hasWeeks = month.weeks.length > 0;
          const isCurrent = idx === currentMonthIndex;
          // Show the real calendar month name based on when the plan started
          const calMonthAbbr = MONTH_ABBR[(startMonth + idx) % 12];
          return (
            <TouchableOpacity
              key={idx}
              style={[s.monthCell, isCurrent && { borderColor: C.primary, borderWidth: 2 }]}
              onPress={() => navigation.navigate('MonthDetail', { monthIndex: idx })}
              activeOpacity={0.75}
            >
              {/* Phase accent bar */}
              <View style={[s.phaseBar, { backgroundColor: ph.color }]} />

              <Text style={[s.monthNum, { color: ph.color }]}>{calMonthAbbr}</Text>
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

    {/* ── Customizer Modal ── */}
    <Modal visible={showCustomizer} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>🎯 Personalizar Treino</Text>
            <TouchableOpacity onPress={() => setShowCustomizer(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {custWorkout ? (
              <View style={s.custResult}>
                <Text style={s.custResultTitle}>{custWorkout.focus}</Text>
                <Text style={s.custResultSub}>{custWorkout.duration} min · {custWorkout.exercises.length} exercícios</Text>
                {custWorkout.exercises.map((ex, i) => (
                  <View key={i} style={s.custExRow}>
                    <Text style={s.custExName}>{ex.name}</Text>
                    <Text style={s.custExMeta}>{ex.sets}×{ex.reps}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={s.custStartBtn}
                  onPress={() => { setShowCustomizer(false); navigateToWorkout(custWorkout!); }}
                >
                  <Text style={s.custStartBtnText}>▶  Iniciar Treino</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.custRegenBtn} onPress={() => setCustWorkout(null)}>
                  <Text style={s.custRegenBtnText}>↺  Gerar outro</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={s.custSection}>Grupos Musculares</Text>
                <View style={s.custPills}>
                  {['Peito','Costas','Ombro','Bíceps','Tríceps','Pernas','Glúteo','Abdômen','Panturrilha'].map((g) => {
                    const sel = custGroups.includes(g);
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[s.custPill, sel && s.custPillActive]}
                        onPress={() => setCustGroups(sel ? custGroups.filter(x => x !== g) : [...custGroups, g])}
                      >
                        <Text style={[s.custPillText, sel && s.custPillTextActive]}>{g}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={s.custSection}>Estratégia</Text>
                <View style={s.custPills}>
                  {['Normal','HIIT','Biset','Triset','Pirâmide','Dropset'].map((st) => {
                    const sel = custStrategy === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[s.custPill, sel && s.custPillActive]}
                        onPress={() => setCustStrategy(sel ? '' : st)}
                      >
                        <Text style={[s.custPillText, sel && s.custPillTextActive]}>{st}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={s.custSection}>Duração</Text>
                <View style={s.custRow}>
                  {[20, 30, 45, 60].map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[s.custDurBtn, custDuration === d && s.custDurBtnActive]}
                      onPress={() => setCustDuration(d)}
                    >
                      <Text style={[s.custDurText, custDuration === d && s.custDurTextActive]}>{d}min</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.custSection}>Equipamento</Text>
                <View style={s.custPills}>
                  {['academia','casa (sem equipamento)','halters apenas','calistenia'].map((eq) => {
                    const sel = custEquipment === eq;
                    return (
                      <TouchableOpacity
                        key={eq}
                        style={[s.custPill, sel && s.custPillActive]}
                        onPress={() => setCustEquipment(eq)}
                      >
                        <Text style={[s.custPillText, sel && s.custPillTextActive]}>{eq}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[s.custGenBtn, custLoading && { opacity: 0.6 }]}
                  onPress={handleGenerateCustom}
                  disabled={custLoading}
                >
                  {custLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.custGenBtnText}>🤖  Gerar Treino com IA</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  exportBtn: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingVertical: 10, alignItems: 'center', marginBottom: 14 },
  exportBtnText: { color: C.primaryLight, fontSize: 14, fontWeight: '700' },
  todayBtn: {
    backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginBottom: 10,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  todayBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  todayBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 },

  planBtn: {
    backgroundColor: C.elevated, borderRadius: 16, paddingVertical: 14,
    alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.45)',
  },
  planBtnText: { color: C.primaryLight, fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  planBtnSub: { color: C.text3, fontSize: 11, marginTop: 4 },

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
  resumeCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.35)', flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  resumeIcon: { fontSize: 24 },
  resumeInfo: { flex: 1 },
  resumeTitle: { color: C.text1, fontSize: 15, fontWeight: '800' },
  resumeSub: { color: C.text3, fontSize: 12, marginTop: 2 },
  resumeArrow: { color: C.text3, fontSize: 22 },

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
  quickHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  customizerBtn: { backgroundColor: C.primaryGlow, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)' },
  customizerBtnText: { color: C.primaryLight, fontSize: 12, fontWeight: '700' },
  filterScroll: { marginHorizontal: -16, marginBottom: 10 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  filterChipActive: { backgroundColor: C.primaryGlow, borderColor: C.primary },
  filterChipText: { color: C.text3, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: C.primaryLight },
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

  // History preview
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyLink: { color: C.primaryLight, fontSize: 13, fontWeight: '700' },
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
  recordsCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border, flexDirection: 'row',
    alignItems: 'center', marginBottom: 8, gap: 12,
  },
  recordsIcon: { fontSize: 26 },
  recordsInfo: { flex: 1 },
  recordsTitle: { color: C.text1, fontSize: 15, fontWeight: '700' },
  recordsSub: { color: C.text3, fontSize: 12, marginTop: 2 },
  recordsArrow: { color: C.text3, fontSize: 22 },
  widgetCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border, flexDirection: 'row',
    alignItems: 'center', marginBottom: 16, gap: 12,
  },
  widgetIcon: { fontSize: 24 },
  widgetInfo: { flex: 1 },
  widgetTitle: { color: C.text1, fontSize: 15, fontWeight: '700' },
  widgetSub: { color: C.text3, fontSize: 12, marginTop: 2 },
  widgetArrow: { color: C.text3, fontSize: 22 },

  // Daily suggestion card
  suggestionCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
  },
  suggestionLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  suggestionLoadingText: { color: C.text3, fontSize: 13 },
  suggestionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  suggestionIcon: { fontSize: 32 },
  suggestionHeaderText: { flex: 1 },
  suggestionLabel: { color: C.primaryLight, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  suggestionTitle: { color: C.text1, fontSize: 16, fontWeight: '800', marginTop: 2 },
  suggestionReason: { color: C.text2, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  suggestionBtn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  suggestionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Customizer modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '85%',
  },
  widgetSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, borderWidth: 1, borderColor: C.border,
  },
  widgetPreview: {
    backgroundColor: C.elevated, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.35)', marginBottom: 12,
  },
  widgetPreviewLabel: { color: C.primaryLight, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  widgetPreviewTitle: { color: C.text1, fontSize: 18, fontWeight: '800', marginTop: 4 },
  widgetPreviewSub: { color: C.text2, fontSize: 13, marginTop: 4, lineHeight: 18 },
  widgetStartBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  widgetStartText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  widgetHint: { color: C.text3, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: C.text1, fontSize: 18, fontWeight: '800' },
  modalClose: { color: C.text3, fontSize: 20, padding: 4 },
  custSection: { color: C.text2, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  custPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  custPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border },
  custPillActive: { backgroundColor: C.primaryGlow, borderColor: C.primary },
  custPillText: { color: C.text2, fontSize: 13, fontWeight: '600' },
  custPillTextActive: { color: C.primaryLight },
  custRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  custDurBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  custDurBtnActive: { backgroundColor: C.primaryGlow, borderColor: C.primary },
  custDurText: { color: C.text2, fontSize: 14, fontWeight: '700' },
  custDurTextActive: { color: C.primaryLight },
  custGenBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  custGenBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  custResult: { paddingBottom: 20 },
  custResultTitle: { color: C.text1, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  custResultSub: { color: C.text3, fontSize: 13, marginBottom: 14 },
  custExRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  custExName: { color: C.text2, fontSize: 14, flex: 1 },
  custExMeta: { color: C.primaryLight, fontSize: 13, fontWeight: '700' },
  custStartBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  custStartBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  custRegenBtn: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: C.border },
  custRegenBtnText: { color: C.text2, fontSize: 14, fontWeight: '600' },

  // Muscle fatigue card
  fatigueCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', gap: 12,
  },
  fatigueIcon: { fontSize: 28 },
  fatigueInfo: { flex: 1 },
  fatigueTitle: { color: C.text1, fontWeight: '700', fontSize: 15 },
  fatigueSub: { color: C.text3, fontSize: 12, marginTop: 2 },
  fatigueArrow: { color: C.text3, fontSize: 22 },
  hiddenCapture: { position: 'absolute', left: -9999, top: 0, opacity: 0 },
  exportCard: {
    width: 400,
    backgroundColor: C.surface,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  exportTitle: { color: C.text1, fontSize: 28, fontWeight: '900', marginBottom: 6 },
  exportSubtitle: { color: C.primaryLight, fontSize: 14, marginBottom: 14 },
  exportLine: { color: C.text2, fontSize: 13, marginBottom: 6 },
  exportHint: { color: C.text3, fontSize: 12, marginTop: 10 },
});
