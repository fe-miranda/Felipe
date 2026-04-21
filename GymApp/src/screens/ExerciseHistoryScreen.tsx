import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, CompletedWorkout } from '../types';
import { loadHistory } from '../services/workoutHistoryService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ExerciseHistory'>;
  route: RouteProp<RootStackParamList, 'ExerciseHistory'>;
};

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA', primaryGlow: 'rgba(124,58,237,0.15)',
  success: '#10B981', warning: '#F59E0B',
  text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;
const CHART_HEIGHT = 140;

interface SessionEntry {
  date: string;
  maxLoad: number;
  totalReps: number;
  totalSets: number;
}

function buildHistory(history: CompletedWorkout[], exerciseName: string): SessionEntry[] {
  const normalized = exerciseName.toLowerCase();
  const entries: SessionEntry[] = [];
  for (const workout of history) {
    for (const ex of workout.exercises) {
      if (ex.name.toLowerCase() !== normalized) continue;
      let maxLoad = 0;
      let totalReps = 0;
      let totalSets = 0;
      for (const set of ex.sets) {
        if (!set.done) continue;
        totalSets++;
        const reps = parseFloat(set.reps) || 0;
        const load = parseFloat(set.load) || 0;
        totalReps += reps;
        if (load > maxLoad) maxLoad = load;
      }
      if (totalSets > 0) {
        entries.push({
          date: workout.date,
          maxLoad,
          totalReps,
          totalSets,
        });
      }
    }
  }
  return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

interface LineChartProps {
  data: number[];
  labels: string[];
  color: string;
  unit: string;
  title: string;
}

function LineChart({ data, labels, color, unit, title }: LineChartProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  return (
    <View style={chart.container}>
      <Text style={chart.title}>{title}</Text>
      <View style={chart.chartArea}>
        {/* Y-axis labels */}
        <View style={chart.yAxis}>
          <Text style={chart.yLabel}>{max.toFixed(0)}</Text>
          <Text style={chart.yLabel}>{(min + range / 2).toFixed(0)}</Text>
          <Text style={chart.yLabel}>{min.toFixed(0)}</Text>
        </View>
        {/* Chart */}
        <View style={chart.plot}>
          {/* Grid lines */}
          {[0, 0.5, 1].map((fraction) => (
            <View key={fraction} style={[chart.gridLine, { bottom: fraction * CHART_HEIGHT }]} />
          ))}
          {/* Bars */}
          {data.map((val, i) => {
            const barHeight = Math.max(4, ((val - min) / range) * CHART_HEIGHT);
            return (
              <View key={i} style={chart.barCol}>
                <View style={chart.barTop}>
                  <Text style={[chart.barValue, { color }]}>
                    {val > 0 ? `${val.toFixed(0)}${unit}` : ''}
                  </Text>
                </View>
                <View style={[chart.bar, { height: barHeight, backgroundColor: color, opacity: i === data.length - 1 ? 1 : 0.6 }]} />
                <Text style={chart.xLabel} numberOfLines={1}>{labels[i]}</Text>
              </View>
            );
          })}
        </View>
      </View>
      {/* Personal record */}
      <View style={[chart.prRow, { borderColor: `${color}40` }]}>
        <Text style={chart.prLabel}>Recorde pessoal</Text>
        <Text style={[chart.prValue, { color }]}>{max.toFixed(1)}{unit}</Text>
      </View>
    </View>
  );
}

const chart = StyleSheet.create({
  container: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  title: { color: C.text2, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  chartArea: { flexDirection: 'row', height: CHART_HEIGHT + 32 },
  yAxis: { width: 32, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 4, paddingBottom: 20, paddingTop: 20 },
  yLabel: { color: C.text3, fontSize: 9 },
  plot: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    gap: 4, paddingBottom: 20, position: 'relative',
  },
  gridLine: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: C.border,
  },
  barCol: { flex: 1, alignItems: 'center' },
  barTop: { height: 20, justifyContent: 'flex-end' },
  barValue: { fontSize: 8, fontWeight: '700' },
  bar: { width: '80%', borderRadius: 3, minHeight: 4 },
  xLabel: { color: C.text3, fontSize: 8, marginTop: 2, textAlign: 'center' },
  prRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1,
  },
  prLabel: { color: C.text3, fontSize: 12 },
  prValue: { fontSize: 14, fontWeight: '900' },
});

export function ExerciseHistoryScreen({ route }: Props) {
  const { exerciseName } = route.params;
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory().then((hist) => {
      setEntries(buildHistory(hist, exerciseName));
      setLoading(false);
    });
  }, [exerciseName]);

  const recentEntries = entries.slice(-12);
  const loads = recentEntries.map((e) => e.maxLoad);
  const reps = recentEntries.map((e) => e.totalReps);
  const labels = recentEntries.map((e) => fmtDate(e.date));

  const allTimeMaxLoad = entries.length ? Math.max(...entries.map((e) => e.maxLoad)) : 0;
  const totalSessions = entries.length;
  const totalSets = entries.reduce((a, e) => a + e.totalSets, 0);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Stats header */}
        <View style={s.statsRow}>
          {[
            { icon: '🏆', value: allTimeMaxLoad > 0 ? `${allTimeMaxLoad.toFixed(0)}kg` : '—', label: 'Máx. carga' },
            { icon: '📅', value: String(totalSessions), label: 'Sessões' },
            { icon: '🔁', value: String(totalSets), label: 'Séries total' },
          ].map((stat, i) => (
            <View key={i} style={s.statCard}>
              <Text style={s.statIcon}>{stat.icon}</Text>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Carregando histórico...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📊</Text>
            <Text style={s.emptyTitle}>Nenhum dado ainda</Text>
            <Text style={s.emptyText}>Complete séries deste exercício para ver a progressão aqui.</Text>
          </View>
        ) : (
          <>
            {loads.some((v) => v > 0) && (
              <LineChart
                data={loads}
                labels={labels}
                color={C.primary}
                unit="kg"
                title="CARGA MÁXIMA POR SESSÃO (kg)"
              />
            )}
            <LineChart
              data={reps}
              labels={labels}
              color={C.success}
              unit=""
              title="TOTAL DE REPS POR SESSÃO"
            />

            {/* Session log */}
            <Text style={s.sectionTitle}>Histórico de Sessões</Text>
            {[...entries].reverse().slice(0, 20).map((entry, i) => (
              <View key={i} style={s.sessionCard}>
                <Text style={s.sessionDate}>{new Date(entry.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                <View style={s.sessionStats}>
                  {entry.maxLoad > 0 && (
                    <View style={s.sessionStat}>
                      <Text style={[s.sessionStatValue, { color: C.primary }]}>{entry.maxLoad.toFixed(0)}kg</Text>
                      <Text style={s.sessionStatLabel}>máx.</Text>
                    </View>
                  )}
                  <View style={s.sessionStat}>
                    <Text style={[s.sessionStatValue, { color: C.success }]}>{entry.totalReps}</Text>
                    <Text style={s.sessionStatLabel}>reps</Text>
                  </View>
                  <View style={s.sessionStat}>
                    <Text style={[s.sessionStatValue, { color: C.text2 }]}>{entry.totalSets}</Text>
                    <Text style={s.sessionStatLabel}>séries</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { color: C.primary, fontSize: 18, fontWeight: '900' },
  statLabel: { color: C.text3, fontSize: 10, marginTop: 2 },

  sectionTitle: { color: C.text1, fontSize: 15, fontWeight: '800', marginBottom: 10 },

  sessionCard: {
    backgroundColor: C.surface, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  sessionDate: { color: C.text2, fontSize: 13, fontWeight: '600', flex: 1 },
  sessionStats: { flexDirection: 'row', gap: 12 },
  sessionStat: { alignItems: 'center' },
  sessionStatValue: { fontSize: 15, fontWeight: '800' },
  sessionStatLabel: { color: C.text3, fontSize: 10 },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: C.text1, fontSize: 18, fontWeight: '700' },
  emptyText: { color: C.text2, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
