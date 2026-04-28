import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { usePlan } from '../hooks/usePlan';
import { setRuntimeApiKey } from '../services/aiService';

const CUSTOM_KEY_STORAGE = '@gymapp_custom_apikey';
const SESSIONS_KEY = '@gymapp_sessions_counter';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const GOAL_LABELS: Record<string, string> = {
  lose_weight: '🔥 Perda de Peso',
  gain_muscle: '💪 Ganho de Massa',
  improve_endurance: '🏃 Resistência',
  increase_strength: '🏋️ Força',
  general_fitness: '⚡ Condicionamento',
};

const MONTH_COLORS = [
  '#6c47ff', '#7c3aed', '#8b5cf6', '#9333ea',
  '#a855f7', '#c026d3', '#db2777', '#e11d48',
  '#ea580c', '#d97706', '#65a30d', '#0891b2',
];

const FOCUS_ICONS: Record<string, string> = {
  Peito: '🫁',
  Costas: '🔙',
  Pernas: '🦵',
  Ombros: '💪',
  Bíceps: '💪',
  Tríceps: '💪',
  Core: '⭕',
  Cardio: '🏃',
  'Full Body': '⚡',
};

function getFocusIcon(focus: string): string {
  for (const key of Object.keys(FOCUS_ICONS)) {
    if (focus.includes(key)) return FOCUS_ICONS[key];
  }
  return '🏋️';
}

export function HomeScreen({ navigation }: Props) {
  const { plan, loadStoredPlan, clearPlan } = usePlan();
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [sessionsLeft, setSessionsLeft] = useState<number | null>(null);

  const currentMonth = new Date().getMonth(); // 0-indexed

  useEffect(() => {
    loadStoredPlan();
    AsyncStorage.getItem(CUSTOM_KEY_STORAGE).then((key) => {
      if (key) setRuntimeApiKey(key);
    });
    AsyncStorage.getItem(SESSIONS_KEY).then((val) => {
      if (val !== null) setSessionsLeft(parseInt(val, 10) || 0);
    });
    // Auto-expand current month on load
    setExpandedMonths(new Set([currentMonth]));
  }, []);

  const handleClearPlan = () => {
    Alert.alert(
      'Criar Novo Plano',
      'Tem certeza? Seu plano atual será perdido.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            await clearPlan();
            navigation.replace('Onboarding');
          },
        },
      ]
    );
  };

  const toggleMonth = useCallback((idx: number) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const toggleDay = useCallback((key: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (!plan) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>Nenhum plano encontrado</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.replace('Onboarding')}
        >
          <Text style={styles.createBtnText}>Criar Plano</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const profile = plan.userProfile;

  // Total sequential workout days across all months/weeks
  const totalDays = plan.monthlyBlocks.reduce(
    (acc, m) => acc + m.weeks.reduce((wa, w) => wa + w.days.length, 0),
    0
  );

  // Estimate current sequential day based on time elapsed since plan creation
  const createdAt = new Date(plan.createdAt);
  const daysSince = Math.max(
    0,
    Math.floor((Date.now() - createdAt.getTime()) / 86400000)
  );
  const currentSeqDay = Math.min(
    Math.floor((daysSince * profile.daysPerWeek) / 7) + 1,
    totalDays
  );

  // Get global sequential day number (1-indexed) for a given position
  const getGlobalDayNum = (mIdx: number, wIdx: number, dIdx: number): number => {
    let count = 0;
    for (let m = 0; m < mIdx; m++) {
      for (const w of plan.monthlyBlocks[m].weeks) count += w.days.length;
    }
    for (let w = 0; w < wIdx; w++) {
      count += plan.monthlyBlocks[mIdx].weeks[w].days.length;
    }
    return count + dIdx + 1;
  };

  const sessionsRemaining =
    sessionsLeft !== null
      ? sessionsLeft
      : Math.max(0, totalDays - currentSeqDay + 1);

  const progressPercent = Math.min(100, Math.round((currentSeqDay / totalDays) * 100));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Olá, {profile.name}! 👋</Text>
          <Text style={styles.subGreeting}>Seu plano anual está pronto</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.iconBtn}
            testID="btn-settings"
          >
            <Text style={styles.iconBtnText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearPlan} style={styles.newPlanBtn}>
            <Text style={styles.newPlanText}>Novo Plano</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Button */}
      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => navigation.navigate('Chat')}
      >
        <Text style={styles.chatBtnIcon}>💬</Text>
        <View style={styles.chatBtnInfo}>
          <Text style={styles.chatBtnTitle}>Chat com IA</Text>
          <Text style={styles.chatBtnSub}>Tire dúvidas, ajuste o plano, peça treinos extras</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      {/* Goal Card */}
      <View style={styles.goalCard}>
        <Text style={styles.goalLabel}>Objetivo</Text>
        <Text style={styles.goalValue}>{GOAL_LABELS[profile.goal]}</Text>
        <Text style={styles.goalDesc}>{plan.overallGoal}</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.daysPerWeek}x</Text>
          <Text style={styles.statLabel}>por semana</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalDays}</Text>
          <Text style={styles.statLabel}>treinos</Text>
        </View>
        <View style={[styles.statCard, styles.statCardHighlight]}>
          <Text style={[styles.statValue, styles.statValueHighlight]}>
            {sessionsRemaining}
          </Text>
          <Text style={styles.statLabel}>📌 restantes</Text>
        </View>
      </View>

      {/* Progress Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progresso do Plano</Text>
          <Text style={styles.progressValue}>
            Dia {currentSeqDay} de {totalDays} ({progressPercent}%)
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` as any }]} />
        </View>
      </View>

      {/* Accordion Plan */}
      <Text style={styles.sectionTitle}>🗓️ Plano de {plan.totalMonths} Meses</Text>

      {plan.monthlyBlocks.map((month, monthIdx) => {
        const isMonthExpanded = expandedMonths.has(monthIdx);
        const color = MONTH_COLORS[monthIdx] ?? '#6c47ff';
        const isCurrent = monthIdx === currentMonth;

        return (
          <View key={monthIdx} style={styles.accordionWrapper}>
            {/* Month Accordion Header */}
            <TouchableOpacity
              style={[styles.monthHeader, isCurrent && styles.monthHeaderCurrent]}
              onPress={() => toggleMonth(monthIdx)}
              activeOpacity={0.8}
            >
              <View style={[styles.monthBadge, { backgroundColor: color }]}>
                <Text style={styles.monthNumber}>{month.month}</Text>
              </View>
              <View style={styles.monthInfo}>
                <Text style={styles.monthName}>{month.monthName}</Text>
                <Text style={styles.monthFocus}>{month.focus}</Text>
              </View>
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Atual</Text>
                </View>
              )}
              <Text style={styles.chevron}>{isMonthExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {/* Month Body: days */}
            {isMonthExpanded && (
              <View style={styles.monthBody}>
                {month.weeks.flatMap((week, weekIdx) =>
                  week.days.map((day, dayIdx) => {
                    const globalDay = getGlobalDayNum(monthIdx, weekIdx, dayIdx);
                    const dayKey = `${monthIdx}-${weekIdx}-${dayIdx}`;
                    const isDayExpanded = expandedDays.has(dayKey);
                    const isCurrentDay = globalDay === currentSeqDay;
                    const isPastDay = globalDay < currentSeqDay;

                    return (
                      <View
                        key={dayKey}
                        style={[
                          styles.dayCard,
                          isCurrentDay && styles.dayCardCurrent,
                          isPastDay && styles.dayCardPast,
                        ]}
                      >
                        {/* Day Header Row */}
                        <TouchableOpacity
                          style={styles.dayHeaderRow}
                          onPress={() => toggleDay(dayKey)}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[
                              styles.dayNumBadge,
                              isCurrentDay && styles.dayNumBadgeCurrent,
                              isPastDay && styles.dayNumBadgePast,
                            ]}
                          >
                            <Text style={styles.dayNumText}>{globalDay}</Text>
                          </View>
                          <View style={styles.dayHeaderInfo}>
                            <View style={styles.dayTitleRow}>
                              <Text style={styles.dayFocusIcon}>
                                {getFocusIcon(day.focus)}
                              </Text>
                              <Text style={styles.dayNameText}>{day.dayOfWeek}</Text>
                              {isCurrentDay && (
                                <View style={styles.todayBadge}>
                                  <Text style={styles.todayBadgeText}>Hoje</Text>
                                </View>
                              )}
                              {isPastDay && (
                                <Text style={styles.doneMark}>✓</Text>
                              )}
                            </View>
                            <Text style={styles.dayFocusText}>{day.focus}</Text>
                            <Text style={styles.dayMeta}>
                              ⏱ {day.duration} min · {day.exercises.length} exercícios
                            </Text>
                          </View>
                          <Text style={styles.chevronSmall}>
                            {isDayExpanded ? '▲' : '▼'}
                          </Text>
                        </TouchableOpacity>

                        {/* Day Body: exercise list + start button */}
                        {isDayExpanded && (
                          <View style={styles.dayBody}>
                            {day.exercises.map((ex, exIdx) => (
                              <View key={exIdx} style={styles.exRow}>
                                <View style={styles.exNumBadge}>
                                  <Text style={styles.exNumText}>{exIdx + 1}</Text>
                                </View>
                                <View style={styles.exInfo}>
                                  <Text style={styles.exName}>{ex.name}</Text>
                                  <Text style={styles.exMeta}>
                                    {ex.sets} séries · {ex.reps} reps · {ex.rest}
                                  </Text>
                                </View>
                              </View>
                            ))}
                            <TouchableOpacity
                              style={styles.startBtn}
                              onPress={() =>
                                navigation.navigate('WorkoutDetail', {
                                  monthIndex: monthIdx,
                                  weekIndex: weekIdx,
                                  dayIndex: dayIdx,
                                })
                              }
                            >
                              <Text style={styles.startBtnText}>▶ Iniciar Treino</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Nutrition Tips */}
      <Text style={styles.sectionTitle}>🥗 Dicas de Nutrição</Text>
      <View style={styles.tipsCard}>
        {plan.nutritionTips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>😴 Recuperação</Text>
      <View style={styles.tipsCard}>
        {plan.recoveryTips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f14' },
  content: { padding: 20, paddingBottom: 40 },

  emptyContainer: {
    flex: 1,
    backgroundColor: '#0f0f14',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyIcon: { fontSize: 60 },
  emptyText: { color: '#888', fontSize: 18 },
  createBtn: {
    backgroundColor: '#6c47ff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  headerLeft: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1a1a24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  iconBtnText: { fontSize: 18 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subGreeting: { color: '#888', fontSize: 13, marginTop: 2 },
  newPlanBtn: {
    backgroundColor: '#1a1a24',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  newPlanText: { color: '#aaa', fontSize: 13 },

  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a0f3a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6c47ff',
    gap: 12,
  },
  chatBtnIcon: { fontSize: 28 },
  chatBtnInfo: { flex: 1 },
  chatBtnTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  chatBtnSub: { color: '#a78bfa', fontSize: 12, marginTop: 2 },

  goalCard: {
    backgroundColor: '#1a0f3a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6c47ff44',
  },
  goalLabel: { color: '#a78bfa', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  goalValue: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  goalDesc: { color: '#888', fontSize: 14, marginTop: 8, lineHeight: 20 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a24',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  statCardHighlight: {
    backgroundColor: '#1a0f3a',
    borderColor: '#6c47ff44',
  },
  statValue: { color: '#6c47ff', fontSize: 26, fontWeight: '900' },
  statValueHighlight: { color: '#a78bfa' },
  statLabel: { color: '#666', fontSize: 12, marginTop: 2 },

  progressCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  progressValue: { color: '#a78bfa', fontSize: 13, fontWeight: '700' },
  progressBarBg: {
    height: 8,
    backgroundColor: '#2a2a3a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#6c47ff',
    borderRadius: 4,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },

  // Accordion
  accordionWrapper: { marginBottom: 6 },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a24',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  monthHeaderCurrent: {
    borderColor: '#6c47ff',
    backgroundColor: '#1a0f3a',
  },
  monthBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  monthNumber: { color: '#fff', fontWeight: '800', fontSize: 16 },
  monthInfo: { flex: 1 },
  monthName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  monthFocus: { color: '#a78bfa', fontSize: 12, marginTop: 2 },
  currentBadge: {
    backgroundColor: '#6c47ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  currentBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  chevron: { color: '#555', fontSize: 14, marginLeft: 4 },

  monthBody: {
    marginTop: 2,
    marginLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#2a2a3a',
    paddingLeft: 10,
  },

  dayCard: {
    backgroundColor: '#13131c',
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#222230',
    overflow: 'hidden',
  },
  dayCardCurrent: {
    borderColor: '#6c47ff',
    backgroundColor: '#120d2a',
  },
  dayCardPast: {
    opacity: 0.6,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  dayNumBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2a2a3a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dayNumBadgeCurrent: { backgroundColor: '#6c47ff' },
  dayNumBadgePast: { backgroundColor: '#333' },
  dayNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  dayHeaderInfo: { flex: 1 },
  dayTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  dayFocusIcon: { fontSize: 14 },
  dayNameText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  todayBadge: {
    backgroundColor: '#6c47ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  todayBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  doneMark: { color: '#65a30d', fontSize: 14, fontWeight: '800' },
  dayFocusText: { color: '#a78bfa', fontSize: 12 },
  dayMeta: { color: '#555', fontSize: 11, marginTop: 2 },
  chevronSmall: { color: '#555', fontSize: 12 },

  dayBody: {
    borderTopWidth: 1,
    borderTopColor: '#222230',
    padding: 12,
    gap: 8,
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6c47ff33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exNumText: { color: '#a78bfa', fontSize: 11, fontWeight: '700' },
  exInfo: { flex: 1 },
  exName: { color: '#ddd', fontSize: 13, fontWeight: '600' },
  exMeta: { color: '#555', fontSize: 11, marginTop: 1 },
  startBtn: {
    backgroundColor: '#6c47ff',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  tipsCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    gap: 10,
  },
  tipRow: { flexDirection: 'row', gap: 8 },
  tipBullet: { color: '#6c47ff', fontSize: 16, marginTop: 1 },
  tipText: { color: '#bbb', fontSize: 14, lineHeight: 20, flex: 1 },
  arrow: { color: '#444', fontSize: 22 },
});
