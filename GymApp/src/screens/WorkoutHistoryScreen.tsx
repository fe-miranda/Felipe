import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import Svg, {
  Rect, Text as SvgText, G, Line, Polyline, Circle as SvgCircle,
  Defs, LinearGradient as SvgGradient, Stop, Path,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, CompletedWorkout } from '../types';
import { loadHistory, deleteWorkout } from '../services/workoutHistoryService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loadPersonalRecords, PersonalRecord } from '../services/personalRecordsService';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'WorkoutHistory'> };

const { width: SCREEN_W } = Dimensions.get('window');

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA', primaryGlow: 'rgba(124,58,237,0.18)',
  success: '#10B981', successBg: 'rgba(16,185,129,0.12)', successBorder: 'rgba(16,185,129,0.35)',
  warning: '#F59E0B', warningBg: 'rgba(245,158,11,0.12)',
  danger: '#EF4444',
  text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const CHART_W = SCREEN_W - 64;
const BAR_H = 90;

// ── Weekly Activity Chart ────────────────────────────────────────────────────
function WeeklyActivityChart({ history }: { history: CompletedWorkout[] }) {
  const now = new Date();
  const days: { label: string; count: number; dateStr: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const label = DAY_LABELS[(d.getDay() + 6) % 7]; // Mon=0
    days.push({ label, dateStr, count: history.filter(w => w.date.slice(0, 10) === dateStr).length });
  }
  const maxCount = Math.max(...days.map(d => d.count), 1);
  const barW = (CHART_W - 8 * 8) / 7;
  const todayStr = now.toISOString().slice(0, 10);

  return (
    <Svg width={CHART_W} height={BAR_H + 32}>
      <Defs>
        <SvgGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={C.primaryLight} stopOpacity="0.6" />
        </SvgGradient>
        <SvgGradient id="todayGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.success} stopOpacity="1" />
          <Stop offset="1" stopColor={C.success} stopOpacity="0.5" />
        </SvgGradient>
      </Defs>
      {days.map((day, i) => {
        const h = Math.max(4, (day.count / maxCount) * BAR_H);
        const x = 8 + i * (barW + 8);
        const y = BAR_H - h;
        const isToday = day.dateStr === todayStr;
        return (
          <G key={i}>
            {/* Background bar */}
            <Rect x={x} y={0} width={barW} height={BAR_H} rx={5} fill={C.elevated} opacity={0.5} />
            {/* Value bar */}
            <Rect x={x} y={y} width={barW} height={h} rx={5}
              fill={day.count > 0 ? (isToday ? 'url(#todayGrad)' : 'url(#barGrad)') : 'transparent'}
            />
            {/* Day label */}
            <SvgText x={x + barW / 2} y={BAR_H + 18} fill={isToday ? C.success : C.text3}
              fontSize={9} textAnchor="middle" fontWeight={isToday ? '800' : '400'}>
              {day.label}
            </SvgText>
            {/* Count badge */}
            {day.count > 0 && (
              <SvgText x={x + barW / 2} y={y - 5} fill={isToday ? C.success : C.primaryLight}
                fontSize={10} textAnchor="middle" fontWeight="900">
                {day.count}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

// ── Volume Line Chart ────────────────────────────────────────────────────────
const LINE_H = 80;

function VolumeLineChart({ history }: { history: CompletedWorkout[] }) {
  const recent = history.slice(-10);
  const data = recent.map(w => w.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0));
  if (data.length < 2) return null;
  const maxVal = Math.max(...data, 1);
  const stepX = CHART_W / (data.length - 1);
  const pts = data.map((v, i) => `${i * stepX},${LINE_H - (v / maxVal) * (LINE_H - 8)}`);
  const points = pts.join(' ');
  const areaPoints = `0,${LINE_H} ${points} ${(data.length - 1) * stepX},${LINE_H}`;

  return (
    <Svg width={CHART_W} height={LINE_H + 28}>
      <Defs>
        <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.primary} stopOpacity="0.35" />
          <Stop offset="1" stopColor={C.primary} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <Line x1={0} y1={LINE_H / 2} x2={CHART_W} y2={LINE_H / 2}
        stroke={C.border} strokeWidth={1} strokeDasharray="4,4" />
      <Path d={`M 0,${LINE_H} L ${pts[0]} ${data.slice(1).map((_, i) => `L ${pts[i + 1]}`).join(' ')} L ${(data.length - 1) * stepX},${LINE_H} Z`}
        fill="url(#areaGrad)" />
      <Polyline points={points} fill="none" stroke={C.primary} strokeWidth={2.5}
        strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => (
        <G key={i}>
          <SvgCircle cx={i * stepX} cy={LINE_H - (v / maxVal) * (LINE_H - 8)} r={5}
            fill={i === data.length - 1 ? C.success : C.primary}
            stroke={i === data.length - 1 ? C.success : C.primaryLight} strokeWidth={1.5}
          />
          <SvgText x={i * stepX} y={LINE_H + 15} fill={C.text3} fontSize={8} textAnchor="middle">
            {fmtDateShort(recent[i].date)}
          </SvgText>
          <SvgText x={i * stepX} y={LINE_H - (v / maxVal) * (LINE_H - 8) - 8}
            fill={i === data.length - 1 ? C.success : C.primaryLight}
            fontSize={9} textAnchor="middle" fontWeight="700">
            {v}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

// ── Duration Line Chart ──────────────────────────────────────────────────────
function DurationChart({ history }: { history: CompletedWorkout[] }) {
  const recent = history.slice(-8);
  const data = recent.map(w => Math.round(w.durationSeconds / 60));
  if (data.length < 2) return null;
  const maxVal = Math.max(...data, 1);
  const stepX = CHART_W / (data.length - 1);
  const pts = data.map((v, i) => `${i * stepX},${LINE_H - (v / maxVal) * (LINE_H - 8)}`);
  const points = pts.join(' ');

  return (
    <Svg width={CHART_W} height={LINE_H + 28}>
      <Defs>
        <SvgGradient id="durGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.warning} stopOpacity="0.3" />
          <Stop offset="1" stopColor={C.warning} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <Path d={`M 0,${LINE_H} L ${pts[0]} ${data.slice(1).map((_, i) => `L ${pts[i + 1]}`).join(' ')} L ${(data.length - 1) * stepX},${LINE_H} Z`}
        fill="url(#durGrad)" />
      <Polyline points={points} fill="none" stroke={C.warning} strokeWidth={2.5}
        strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => (
        <G key={i}>
          <SvgCircle cx={i * stepX} cy={LINE_H - (v / maxVal) * (LINE_H - 8)} r={4}
            fill={C.warning} stroke={C.warningBg} strokeWidth={2} />
          <SvgText x={i * stepX} y={LINE_H + 15} fill={C.text3} fontSize={8} textAnchor="middle">
            {fmtDateShort(recent[i].date)}
          </SvgText>
          <SvgText x={i * stepX} y={LINE_H - (v / maxVal) * (LINE_H - 8) - 8}
            fill={C.warning} fontSize={9} textAnchor="middle" fontWeight="700">
            {v}m
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

// ── Personal Record Progress Bar ─────────────────────────────────────────────
function calcStreak(history: CompletedWorkout[]): number {
  if (!history.length) return 0;
  const uniqueDays = [...new Set(history.map(w => w.date.slice(0, 10)))].sort().reverse();
  const todayStr = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let cursor = todayStr;
  for (const day of uniqueDays) {
    if (day === cursor) {
      streak++;
      const prev = new Date(cursor);
      prev.setDate(prev.getDate() - 1);
      cursor = prev.toISOString().slice(0, 10);
    } else {
      break;
    }
  }
  return streak;
}

function bestLoad(workout: CompletedWorkout): string {
  let best = 0;
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      const kg = parseFloat(set.load);
      if (!isNaN(kg) && kg > best) best = kg;
    }
  }
  return best > 0 ? `${best}kg` : '—';
}

function completionPct(workout: CompletedWorkout): number {
  const done = workout.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  const total = workout.exercises.reduce((a, e) => a + e.sets.length, 0);
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

type Tab = 'history' | 'records';

export function WorkoutHistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [tab, setTab] = useState<Tab>('history');

  const reload = useCallback(async () => {
    const [hist, prs] = await Promise.all([loadHistory(), loadPersonalRecords()]);
    setHistory(hist);
    setRecords(prs);
  }, []);

  useEffect(() => { reload(); }, []);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Remover treino', 'Deseja remover este treino do histórico?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => { await deleteWorkout(id); reload(); },
      },
    ]);
  }, [reload]);

  const totalMinutes = Math.round(history.reduce((a, w) => a + w.durationSeconds, 0) / 60);
  const totalDoneSets = history.reduce(
    (a, w) => a + w.exercises.reduce((b, e) => b + e.sets.filter(s => s.done).length, 0), 0,
  );
  const streak = calcStreak(history);
  const avgDuration = history.length > 0 ? Math.round(totalMinutes / history.length) : 0;

  const maxLoad = Math.max(...records.map(r => r.maxLoad), 1);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Stats banner ── */}
      <View style={s.statsBanner}>
        {[
          { icon: '🏋️', value: String(history.length), label: 'Treinos',   color: C.primary },
          { icon: '⏱',  value: `${totalMinutes}`,      label: 'Minutos',   color: C.warning },
          { icon: '🔥', value: String(streak),          label: 'Sequência', color: C.danger },
          { icon: '💪', value: String(totalDoneSets),   label: 'Séries',    color: C.success },
        ].map((stat, i) => (
          <View key={i} style={s.statCard}>
            <Text style={s.statIcon}>{stat.icon}</Text>
            <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Extra stats row ── */}
      {history.length > 0 && (
        <View style={s.extraStats}>
          <View style={s.extraStatItem}>
            <Text style={s.extraStatIcon}>📊</Text>
            <Text style={s.extraStatValue}>{avgDuration}min</Text>
            <Text style={s.extraStatLabel}>Duração média</Text>
          </View>
          <View style={s.extraStatDivider} />
          <View style={s.extraStatItem}>
            <Text style={s.extraStatIcon}>🏆</Text>
            <Text style={s.extraStatValue}>{records.length}</Text>
            <Text style={s.extraStatLabel}>Recordes</Text>
          </View>
          <View style={s.extraStatDivider} />
          <View style={s.extraStatItem}>
            <Text style={s.extraStatIcon}>📅</Text>
            <Text style={s.extraStatValue}>
              {history.length > 0 ? fmtDateShort(history[history.length - 1].date) : '—'}
            </Text>
            <Text style={s.extraStatLabel}>Primeiro treino</Text>
          </View>
        </View>
      )}

      {/* ── Charts ── */}
      {history.length > 0 && (
        <View style={s.chartCard}>
          <View style={s.chartTitleRow}>
            <Text style={s.chartTitle}>📅 Atividade — últimos 7 dias</Text>
          </View>
          <View style={s.chartInner}>
            <WeeklyActivityChart history={history} />
          </View>
        </View>
      )}

      {history.length >= 2 && (
        <View style={s.chartCard}>
          <View style={s.chartTitleRow}>
            <Text style={s.chartTitle}>📈 Volume por treino</Text>
            <Text style={s.chartSubtitle}>séries concluídas</Text>
          </View>
          <View style={s.chartInner}>
            <VolumeLineChart history={history} />
          </View>
        </View>
      )}

      {history.length >= 2 && (
        <View style={s.chartCard}>
          <View style={s.chartTitleRow}>
            <Text style={s.chartTitle}>⏱ Duração dos treinos</Text>
            <Text style={s.chartSubtitle}>minutos</Text>
          </View>
          <View style={s.chartInner}>
            <DurationChart history={history} />
          </View>
        </View>
      )}

      {/* ── Tab switcher ── */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'history' && s.tabBtnActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[s.tabBtnText, tab === 'history' && s.tabBtnTextActive]}>📋 Histórico</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'records' && s.tabBtnActive]}
          onPress={() => setTab('records')}
        >
          <Text style={[s.tabBtnText, tab === 'records' && s.tabBtnTextActive]}>🏆 Recordes</Text>
        </TouchableOpacity>
      </View>

      {/* ── Records tab ── */}
      {tab === 'records' && (
        <>
          {records.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🏆</Text>
              <Text style={s.emptyTitle}>Sem recordes ainda</Text>
              <Text style={s.emptyDesc}>Complete treinos com cargas para liberar seus recordes pessoais.</Text>
            </View>
          ) : (
            <>
              <View style={s.recordsHeader}>
                <Text style={s.recordsHeadText}>Seu melhor em cada exercício</Text>
                <View style={s.recordsBadge}>
                  <Text style={s.recordsBadgeText}>{records.length}</Text>
                </View>
              </View>
              {records.map((r, ri) => {
                const pct = maxLoad > 0 ? Math.min(r.maxLoad / maxLoad, 1) : 0;
                const medal = ri === 0 ? '🥇' : ri === 1 ? '🥈' : ri === 2 ? '🥉' : '💪';
                const barColor = ri === 0 ? C.warning : ri === 1 ? C.text2 : ri === 2 ? '#cd7f32' : C.primary;
                return (
                  <View key={r.exerciseName} style={s.recordCard}>
                    <View style={s.recordCardTop}>
                      <Text style={s.recordMedal}>{medal}</Text>
                      <View style={s.recordInfo}>
                        <Text style={s.recordName} numberOfLines={1}>{r.exerciseName}</Text>
                        <View style={s.recordChips}>
                          {r.maxLoad > 0 && (
                            <View style={[s.recordChip, { borderColor: `${C.success}50`, backgroundColor: C.successBg }]}>
                              <Text style={[s.recordChipText, { color: C.success }]}>⬆ {Math.round(r.maxLoad)}kg</Text>
                            </View>
                          )}
                          <View style={[s.recordChip, { borderColor: `${C.primary}50`, backgroundColor: C.primaryGlow }]}>
                            <Text style={[s.recordChipText, { color: C.primaryLight }]}>🔁 {r.maxReps} reps</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {r.maxLoad > 0 && (
                      <View style={s.recordBarWrap}>
                        <View style={s.recordBarBg}>
                          <View style={[s.recordBarFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
                        </View>
                        <Text style={s.recordBarPct}>{Math.round(pct * 100)}%</Text>
                      </View>
                    )}
                    <Text style={s.recordDate}>
                      Último: {fmtDate(r.date)}
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </>
      )}

      {/* ── History tab ── */}
      {tab === 'history' && (
        <>
          {history.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>📋</Text>
              <Text style={s.emptyTitle}>Nenhum treino registrado</Text>
              <Text style={s.emptyDesc}>Complete um treino para acompanhar seu progresso aqui.</Text>
            </View>
          ) : (
            history.map((w) => {
              const doneSets = w.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
              const totalSets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
              const pct = completionPct(w);
              const loadsPerEx = w.exercises
                .map(ex => {
                  const loads = ex.sets.filter(s => s.done && s.load).map(s => `${s.load}kg`);
                  return loads.length ? { name: ex.name, loads: loads.join(' · ') } : null;
                })
                .filter(Boolean) as { name: string; loads: string }[];

              return (
                <View key={w.id} style={s.card}>
                  <View style={s.cardHeader}>
                    <View style={s.cardHeaderLeft}>
                      <Text style={s.cardDate}>{fmtDate(w.date)}</Text>
                      <Text style={s.cardFocus}>{w.focus}</Text>
                    </View>
                    <View style={s.cardHeaderRight}>
                      <View style={[s.pctBadge, { backgroundColor: pct >= 80 ? C.successBg : C.elevated, borderColor: pct >= 80 ? C.successBorder : C.border }]}>
                        <Text style={[s.pctText, { color: pct >= 80 ? C.success : C.text3 }]}>{pct}%</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(w.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={s.deleteBtn}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Completion progress bar */}
                  <View style={s.completionBar}>
                    <View style={[s.completionFill, {
                      width: `${pct}%`,
                      backgroundColor: pct >= 80 ? C.success : pct >= 50 ? C.warning : C.danger,
                    }]} />
                  </View>

                  <View style={s.cardChips}>
                    <View style={s.chip}>
                      <Text style={s.chipText}>💪 {w.exercises.length} exerc.</Text>
                    </View>
                    <View style={s.chip}>
                      <Text style={s.chipText}>🔁 {doneSets}/{totalSets} séries</Text>
                    </View>
                    <View style={s.chip}>
                      <Text style={s.chipText}>⏱ {fmtDuration(w.durationSeconds)}</Text>
                    </View>
                    <View style={[s.chip, s.chipAccent]}>
                      <Text
                        testID="chip-best-load"
                        style={[s.chipText, { color: C.success }]}
                      >
                        ⬆ {bestLoad(w)}
                      </Text>
                    </View>
                  </View>

                  {loadsPerEx.length > 0 && (
                    <View style={s.loadsSection}>
                      {loadsPerEx.map((entry, i) => (
                        <View key={i} style={s.loadRow}>
                          <Text style={s.loadName} numberOfLines={1}>{entry.name}</Text>
                          <Text style={s.loadValues}>{entry.loads}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 12 },

  // Stats banner
  statsBanner: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 14,
    padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  statIcon: { fontSize: 18, marginBottom: 3 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { color: C.text3, fontSize: 9, marginTop: 2 },

  // Extra stats
  extraStats: {
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  extraStatItem: { flex: 1, alignItems: 'center' },
  extraStatIcon: { fontSize: 16, marginBottom: 3 },
  extraStatValue: { color: C.text1, fontSize: 14, fontWeight: '800' },
  extraStatLabel: { color: C.text3, fontSize: 9, marginTop: 2, textAlign: 'center' },
  extraStatDivider: { width: 1, height: 36, backgroundColor: C.border },

  // Charts
  chartCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  chartTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  chartTitle: { color: C.text1, fontSize: 14, fontWeight: '800' },
  chartSubtitle: { color: C.text3, fontSize: 11 },
  chartInner: { alignItems: 'center' },

  // Tab switcher
  tabRow: {
    flexDirection: 'row', backgroundColor: C.elevated,
    borderRadius: 14, padding: 4, gap: 4, borderWidth: 1, borderColor: C.border,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: C.primary },
  tabBtnText: { color: C.text3, fontSize: 13, fontWeight: '700' },
  tabBtnTextActive: { color: '#fff' },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 56, gap: 10 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { color: C.text1, fontSize: 18, fontWeight: '700' },
  emptyDesc: { color: C.text2, fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

  // Records
  recordsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  recordsHeadText: { color: C.text2, fontSize: 13, fontWeight: '600', flex: 1 },
  recordsBadge: {
    backgroundColor: C.primaryGlow, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)',
  },
  recordsBadgeText: { color: C.primaryLight, fontSize: 12, fontWeight: '800' },

  recordCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  recordCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  recordMedal: { fontSize: 28, lineHeight: 32 },
  recordInfo: { flex: 1 },
  recordName: { color: C.text1, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  recordChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  recordChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1,
  },
  recordChipText: { fontSize: 12, fontWeight: '700' },
  recordBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  recordBarBg: { flex: 1, height: 8, backgroundColor: C.elevated, borderRadius: 4, overflow: 'hidden' },
  recordBarFill: { height: 8, borderRadius: 4 },
  recordBarPct: { color: C.text3, fontSize: 11, fontWeight: '700', width: 32, textAlign: 'right' },
  recordDate: { color: C.text3, fontSize: 11 },

  // Workout cards
  card: {
    backgroundColor: C.surface, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: C.border, gap: 0,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardHeaderLeft: { flex: 1 },
  cardDate: { color: C.text3, fontSize: 11 },
  cardFocus: { color: C.text1, fontSize: 16, fontWeight: '800', marginTop: 2 },
  cardHeaderRight: { alignItems: 'flex-end', gap: 6 },
  pctBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  pctText: { fontSize: 12, fontWeight: '800' },
  deleteBtn: { color: C.text3, fontSize: 14 },

  completionBar: { height: 4, backgroundColor: C.elevated, borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  completionFill: { height: 4, borderRadius: 2 },

  cardChips: { flexDirection: 'row', gap: 5, marginBottom: 8, flexWrap: 'wrap' },
  chip: {
    backgroundColor: C.elevated, borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: C.border,
  },
  chipAccent: { borderColor: `${C.success}40`, backgroundColor: C.successBg },
  chipText: { color: C.text2, fontSize: 11, fontWeight: '600' },

  loadsSection: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, gap: 4 },
  loadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loadName: { color: C.text2, fontSize: 12, flex: 1, marginRight: 10 },
  loadValues: { color: C.success, fontSize: 12, fontWeight: '700' },
});
