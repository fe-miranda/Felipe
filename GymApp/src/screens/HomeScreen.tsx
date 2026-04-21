import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, CompletedWorkout } from '../types';
import { usePlan } from '../hooks/usePlan';
import { loadHistory } from '../services/workoutHistoryService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 3;

const CUSTOM_KEY_STORAGE = '@gymapp_custom_apikey';

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

const PHASE = (i: number) => {
  if (i < 3)  return { color: '#10B981', label: 'Base',        bg: 'rgba(16,185,129,0.15)' };
  if (i < 6)  return { color: '#3B82F6', label: 'Evolução',    bg: 'rgba(59,130,246,0.15)' };
  if (i < 9)  return { color: '#F59E0B', label: 'Intensidade', bg: 'rgba(245,158,11,0.15)' };
  return             { color: '#EF4444', label: 'Pico',         bg: 'rgba(239,68,68,0.15)' };
};

const MONTH_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const DAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function fmtHistoryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}min` : `${s}s`;
}

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Home'> };

export function HomeScreen({ navigation }: Props) {
  const { plan, loadStoredPlan, clearPlan } = usePlan();
  const [recentWorkouts, setRecentWorkouts] = useState<CompletedWorkout[]>([]);

  const reloadHistory = useCallback(async () => {
    const hist = await loadHistory();
    setRecentWorkouts(hist.slice(0, 3));
  }, []);

  useEffect(() => {
    loadStoredPlan();
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

  // Calendar: calculate current month index relative to plan start
  const planStart = new Date(plan.createdAt);
  const now = new Date();
  const monthsElapsed = (now.getFullYear() - planStart.getFullYear()) * 12
    + (now.getMonth() - planStart.getMonth());
  const currentMonthIdx = Math.min(Math.max(0, monthsElapsed), monthlyBlocks.length - 1);
  const planStartMonth = planStart.getMonth();

  // Find today's workout in the plan
  const todayDayOfWeek = DAYS_PT[now.getDay()];
  const currentMonth = monthlyBlocks[currentMonthIdx];
  const currentWeekIdx = currentMonth?.weeks.length > 0
    ? Math.min(
        Math.floor((now.getDate() - 1) / 7),
        currentMonth.weeks.length - 1,
      )
    : null;
  const todayWorkout = currentWeekIdx !== null
    ? currentMonth.weeks[currentWeekIdx]?.days.find(
        (d) => d.dayOfWeek.startsWith(todayDayOfWeek),
      ) ?? null
    : null;

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <View>
          <Text style={s.greeting}>{greeting()}, {p.name} 👋</Text>
          <Text style={s.greetingSub}>Seu plano de 12 meses está ativo</Text>
        </View>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Settings')} testID="btn-settings">
          <Text style={s.iconBtnText}>⚙️</Text>
        </TouchableOpacity>
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

      {/* ── Acessar seu treino ── */}
      <View style={s.planAccessCard}>
        <View style={s.planAccessHeader}>
          <Text style={s.planAccessTitle}>📅 Seu Plano de Treino</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MonthDetail', { monthIndex: currentMonthIdx })}>
            <Text style={s.planAccessLink}>Ver plano completo ›</Text>
          </TouchableOpacity>
        </View>

        {todayWorkout ? (
          <View style={s.todayWorkout}>
            <View style={s.todayInfo}>
              <Text style={s.todayLabel}>TREINO DE HOJE</Text>
              <Text style={s.todayFocus}>{todayWorkout.focus}</Text>
              <Text style={s.todayMeta}>{todayWorkout.exercises.length} exercícios · {todayWorkout.duration} min</Text>
            </View>
            <TouchableOpacity
              style={s.accessBtn}
              activeOpacity={0.85}
              onPress={() => {
                if (currentWeekIdx !== null) {
                  const dayIdx = currentMonth.weeks[currentWeekIdx].days.findIndex(
                    (d) => d.dayOfWeek.startsWith(todayDayOfWeek),
                  );
                  navigation.navigate('WorkoutDetail', {
                    monthIndex: currentMonthIdx,
                    weekIndex: currentWeekIdx,
                    dayIndex: dayIdx >= 0 ? dayIdx : 0,
                  });
                }
              }}
            >
              <Text style={s.accessBtnText}>▶  Acessar Treino</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={s.noTodayBtn}
            onPress={() => navigation.navigate('MonthDetail', { monthIndex: currentMonthIdx })}
          >
            <Text style={s.noTodayText}>
              {currentMonth?.weeks.length > 0
                ? 'Nenhum treino planejado para hoje — ver semana'
                : 'Gerar treinos detalhados para este mês →'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Stats row ── */}
      <View style={s.statsRow}>
        {[
          { icon: '📅', value: `${p.daysPerWeek}×`, label: 'por semana' },
          { icon: '📆', value: '12',                  label: 'meses' },
          { icon: '🏆', value: `${p.daysPerWeek * 48}`, label: 'treinos' },
        ].map((stat, i) => (
          <View key={i} style={s.statCard}>
            <Text style={s.statIcon}>{stat.icon}</Text>
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Quick actions row ── */}
      <View style={s.quickActionsRow}>
        <TouchableOpacity style={s.quickAction} onPress={() => navigation.navigate('Chat')} activeOpacity={0.82}>
          <Text style={s.quickActionIcon}>🤖</Text>
          <Text style={s.quickActionLabel}>Coach IA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickAction} onPress={() => navigation.navigate('Performance')} activeOpacity={0.82}>
          <Text style={s.quickActionIcon}>📊</Text>
          <Text style={s.quickActionLabel}>Desempenho</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickAction} onPress={() => navigation.navigate('MuscleFatigue')} activeOpacity={0.82}>
          <Text style={s.quickActionIcon}>🔥</Text>
          <Text style={s.quickActionLabel}>Fadiga</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickAction} onPress={() => navigation.navigate('WorkoutHistory')} activeOpacity={0.82}>
          <Text style={s.quickActionIcon}>📋</Text>
          <Text style={s.quickActionLabel}>Histórico</Text>
        </TouchableOpacity>
      </View>

      {/* ── Recent history ── */}
      <View style={s.historyHeader}>
        <Text style={s.sectionTitle}>📋 Últimos Treinos</Text>
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

      {/* ── Month grid ── */}
      <Text style={[s.sectionTitle, { marginTop: 8 }]}>📅 Plano Anual</Text>
      <View style={s.monthGrid}>
        {monthlyBlocks.map((month, idx) => {
          const ph = PHASE(idx);
          const hasWeeks = month.weeks.length > 0;
          const calendarMonth = (planStartMonth + idx) % 12;
          const isCurrent = idx === currentMonthIdx;
          return (
            <TouchableOpacity
              key={idx}
              style={[s.monthCell, isCurrent && { borderColor: C.primary, borderWidth: 2 }]}
              onPress={() => navigation.navigate('MonthDetail', { monthIndex: idx })}
              activeOpacity={0.75}
            >
              <View style={[s.phaseBar, { backgroundColor: ph.color }]} />
              <Text style={[s.monthNum, { color: ph.color }]}>{MONTH_ABBR[calendarMonth]}</Text>
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
  content: { padding: 16, paddingBottom: 24 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 72, marginBottom: 8 },
  emptyTitle: { color: C.text1, fontSize: 22, fontWeight: '800' },
  emptyDesc: { color: C.text2, fontSize: 15, textAlign: 'center' },
  emptyBtn: { marginTop: 8, backgroundColor: C.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8, marginBottom: 16 },
  greeting: { color: C.text1, fontSize: 20, fontWeight: '800' },
  greetingSub: { color: C.text3, fontSize: 12, marginTop: 2 },
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  iconBtnText: { fontSize: 18 },

  heroCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.35)',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
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

  // Plan access card
  planAccessCard: {
    backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  planAccessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planAccessTitle: { color: C.text1, fontSize: 15, fontWeight: '800' },
  planAccessLink: { color: C.primaryLight, fontSize: 12, fontWeight: '600' },
  todayWorkout: { gap: 10 },
  todayInfo: { gap: 3 },
  todayLabel: { color: C.primaryLight, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  todayFocus: { color: C.text1, fontSize: 18, fontWeight: '900' },
  todayMeta: { color: C.text3, fontSize: 12 },
  accessBtn: {
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  accessBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  noTodayBtn: { backgroundColor: C.elevated, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border },
  noTodayText: { color: C.text3, fontSize: 13, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { color: C.primary, fontSize: 22, fontWeight: '900' },
  statLabel: { color: C.text3, fontSize: 11, marginTop: 2 },

  // Quick actions
  quickActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickAction: {
    flex: 1, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: C.border, gap: 6,
  },
  quickActionIcon: { fontSize: 24 },
  quickActionLabel: { color: C.text2, fontSize: 11, fontWeight: '600' },

  sectionTitle: { color: C.text1, fontSize: 16, fontWeight: '800', marginBottom: 12 },

  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  monthCell: {
    width: CARD_WIDTH, backgroundColor: C.surface, borderRadius: 12,
    padding: 10, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', overflow: 'hidden', minHeight: 80, justifyContent: 'space-between',
  },
  phaseBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  monthNum: { fontSize: 13, fontWeight: '800', marginTop: 6 },
  monthFocus: { color: C.text3, fontSize: 9, textAlign: 'center', marginTop: 2 },
  monthStatus: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  monthStatusText: { fontSize: 11, fontWeight: '700' },

  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: C.text3, fontSize: 11 },

  tipsCard: { backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border, gap: 10 },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginTop: 6, flexShrink: 0 },
  tipText: { color: C.text2, fontSize: 14, lineHeight: 20, flex: 1 },

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
});
