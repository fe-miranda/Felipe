import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Svg, { Rect, Text as SvgText, G, Line, Polyline, Circle as SvgCircle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, CompletedWorkout } from '../types';
import { loadHistory, deleteWorkout } from '../services/workoutHistoryService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loadPersonalRecords, PersonalRecord } from '../services/personalRecordsService';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'WorkoutHistory'> };

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA',
  success: '#10B981', successBg: 'rgba(16,185,129,0.12)',
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

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const CHART_W = 280;
const BAR_H = 80;

function WeeklyActivityChart({ history }: { history: CompletedWorkout[] }) {
  // Count workouts per day of week in last 7 days
  const now = new Date();
  const counts = Array(7).fill(0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    counts[i] = history.filter(w => w.date.slice(0, 10) === dayStr).length;
  }
  const maxCount = Math.max(...counts, 1);
  const barW = (CHART_W - 8 * 8) / 7;

  return (
    <Svg width={CHART_W} height={BAR_H + 24}>
      {counts.map((c, i) => {
        const h = Math.max(4, (c / maxCount) * BAR_H);
        const x = 8 + i * (barW + 8);
        const y = BAR_H - h;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={h} rx={4}
              fill={c > 0 ? C.primary : C.elevated} opacity={c > 0 ? 0.9 : 1}
            />
            <SvgText x={x + barW / 2} y={BAR_H + 14} fill={C.text3} fontSize={9} textAnchor="middle">
              {DAY_LABELS[i]}
            </SvgText>
            {c > 0 && (
              <SvgText x={x + barW / 2} y={y - 3} fill={C.primaryLight} fontSize={9} textAnchor="middle" fontWeight="700">
                {c}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

const LINE_W = 280;
const LINE_H = 80;

function VolumeLineChart({ history }: { history: CompletedWorkout[] }) {
  const data = history.slice(-10).map(w => w.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0));
  if (data.length < 2) return null;
  const maxVal = Math.max(...data, 1);
  const stepX = LINE_W / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${LINE_H - (v / maxVal) * LINE_H}`).join(' ');

  return (
    <Svg width={LINE_W} height={LINE_H + 16}>
      <Line x1={0} y1={LINE_H / 2} x2={LINE_W} y2={LINE_H / 2} stroke={C.border} strokeWidth={0.5} strokeDasharray="4,4" />
      <Polyline points={points} fill="none" stroke={C.primary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => (
        <G key={i}>
          <SvgCircle cx={i * stepX} cy={LINE_H - (v / maxVal) * LINE_H} r={4} fill={C.primary} />
          <SvgText x={i * stepX} y={LINE_H + 13} fill={C.text3} fontSize={8} textAnchor="middle">{v}</SvgText>
        </G>
      ))}
    </Svg>
  );
}

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

export function WorkoutHistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);

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

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Overview stats ── */}
      <View style={s.statsGrid}>
        {[
          { icon: '🏋️', value: String(history.length), label: 'Treinos' },
          { icon: '⏱',  value: String(totalMinutes),   label: 'Minutos' },
          { icon: '🔥', value: String(streak),          label: 'Sequência' },
          { icon: '💪', value: String(totalDoneSets),   label: 'Séries' },
        ].map((stat, i) => (
          <View key={i} style={s.statCard}>
            <Text style={s.statIcon}>{stat.icon}</Text>
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Weekly Activity Chart ── */}
      {history.length > 0 && (
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>📅 Atividade Semanal</Text>
          <View style={s.chartInner}>
            <WeeklyActivityChart history={history} />
          </View>
        </View>
      )}

      {/* ── Volume Chart ── */}
      {history.length >= 2 && (
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>📈 Volume por Treino (séries)</Text>
          <View style={s.chartInner}>
            <VolumeLineChart history={history} />
          </View>
        </View>
      )}

      {history.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>📋</Text>
          <Text style={s.emptyTitle}>Nenhum treino registrado</Text>
          <Text style={s.emptyDesc}>
            Complete um treino para acompanhar seu progresso aqui.
          </Text>
        </View>
      ) : (
        history.map((w) => {
          const doneSets = w.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
          const totalSets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
          const loadsPerEx = w.exercises
            .map(ex => {
              const loads = ex.sets.filter(s => s.done && s.load).map(s => `${s.load}kg`);
              return loads.length ? { name: ex.name, loads: loads.join(' · ') } : null;
            })
            .filter(Boolean) as { name: string; loads: string }[];

          return (
            <View key={w.id} style={s.card}>
              <View style={s.cardHeader}>
                <View>
                  <Text style={s.cardDate}>{fmtDate(w.date)}</Text>
                  <Text style={s.cardFocus}>{w.focus}</Text>
                </View>
                <View style={s.cardHeaderRight}>
                  <Text style={s.cardDuration}>{fmtDuration(w.durationSeconds)}</Text>
                  <TouchableOpacity onPress={() => handleDelete(w.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={s.deleteBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.cardChips}>
                <View style={s.chip}>
                  <Text style={s.chipText}>💪 {w.exercises.length} exercícios</Text>
                </View>
                <View style={s.chip}>
                  <Text style={s.chipText}>🔁 {doneSets}/{totalSets} séries</Text>
                </View>
                <View style={[s.chip, s.chipAccent]}>
                  <Text style={[s.chipText, { color: C.success }]}>⬆ {bestLoad(w)}</Text>
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

      <View style={s.recordsWrap}>
        <Text style={s.recordsTitle}>🏆 Meus Records</Text>
        {records.length === 0 ? (
          <Text style={s.recordsEmpty}>Complete treinos com cargas/reps para liberar seus recordes aqui.</Text>
        ) : (
          records.map((r) => (
            <View key={r.exerciseName} style={s.recordRow}>
              <Text style={s.recordName} numberOfLines={1}>{r.exerciseName}</Text>
              <Text style={s.recordMeta}>
                {r.maxLoad > 0 ? `${Math.round(r.maxLoad)}kg` : '—'} · {r.maxReps} reps
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 12 },

  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 14,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { color: C.primary, fontSize: 20, fontWeight: '900' },
  statLabel: { color: C.text3, fontSize: 10, marginTop: 2 },

  chartCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  chartTitle: { color: C.text1, fontSize: 14, fontWeight: '800', marginBottom: 12 },
  chartInner: { alignItems: 'center' },

  empty: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { color: C.text1, fontSize: 18, fontWeight: '700' },
  emptyDesc: { color: C.text2, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: C.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: C.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardDate: { color: C.text3, fontSize: 12 },
  cardFocus: { color: C.text1, fontSize: 16, fontWeight: '800', marginTop: 2 },
  cardHeaderRight: { alignItems: 'flex-end', gap: 6 },
  cardDuration: { color: C.primaryLight, fontSize: 13, fontWeight: '700' },
  deleteBtn: { color: C.text3, fontSize: 14 },

  cardChips: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  chip: {
    backgroundColor: C.elevated, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.border,
  },
  chipAccent: { borderColor: `${C.success}40`, backgroundColor: C.successBg },
  chipText: { color: C.text2, fontSize: 12, fontWeight: '600' },

  loadsSection: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, gap: 4 },
  loadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loadName: { color: C.text2, fontSize: 13, flex: 1, marginRight: 10 },
  loadValues: { color: C.success, fontSize: 12, fontWeight: '700' },
  recordsWrap: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 8 },
  recordsTitle: { color: C.text1, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  recordsEmpty: { color: C.text3, fontSize: 13 },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  recordName: { color: C.text2, flex: 1, fontSize: 13, fontWeight: '600' },
  recordMeta: { color: C.success, fontSize: 12, fontWeight: '800' },
});
