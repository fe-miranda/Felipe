import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
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

      {records.length > 0 && (
        <View style={s.recordsWrap}>
          <Text style={s.recordsTitle}>🏆 Meus Records</Text>
          {records.map((r) => (
            <View key={r.exerciseName} style={s.recordRow}>
              <Text style={s.recordName} numberOfLines={1}>{r.exerciseName}</Text>
              <Text style={s.recordMeta}>
                {r.maxLoad > 0 ? `${Math.round(r.maxLoad)}kg` : '—'} · {r.maxReps} reps
              </Text>
            </View>
          ))}
        </View>
      )}
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
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  recordName: { color: C.text2, flex: 1, fontSize: 13, fontWeight: '600' },
  recordMeta: { color: C.success, fontSize: 12, fontWeight: '800' },
});
