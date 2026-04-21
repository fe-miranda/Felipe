import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, CompletedWorkout } from '../types';
import { loadHistory } from '../services/workoutHistoryService';
import { loadPersonalRecords, PersonalRecord } from '../services/personalRecordsService';
import { analyzePerformance } from '../services/aiService';
import { usePlan } from '../hooks/usePlan';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Performance'> };

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA', primaryGlow: 'rgba(124,58,237,0.15)',
  success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
  text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

const { width } = Dimensions.get('window');
const BAR_MAX_WIDTH = width - 96;

interface WeekSummary {
  label: string;
  workouts: number;
  totalSets: number;
  totalVolume: number;
}

function buildWeeklyData(history: CompletedWorkout[]): WeekSummary[] {
  const weeks: Record<string, WeekSummary> = {};
  for (const workout of history) {
    const d = new Date(workout.date);
    const dayOfWeek = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    const label = `${monday.getDate().toString().padStart(2, '0')}/${(monday.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!weeks[key]) weeks[key] = { label, workouts: 0, totalSets: 0, totalVolume: 0 };
    const w = weeks[key];
    w.workouts++;
    for (const ex of workout.exercises) {
      for (const set of ex.sets) {
        if (!set.done) continue;
        w.totalSets++;
        const load = parseFloat(set.load) || 0;
        const reps = parseFloat(set.reps) || 0;
        w.totalVolume += load * reps;
      }
    }
  }
  return Object.values(weeks).sort((a, b) => a.label.localeCompare(b.label)).slice(-8);
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function PerformanceScreen({ navigation }: Props) {
  const { plan } = usePlan();
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeekSummary[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const hist = await loadHistory();
      const records = await loadPersonalRecords();
      setHistory(hist);
      setPrs(records.slice(0, 10));
      setWeeklyData(buildWeeklyData(hist));
      setLoading(false);
    })();
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (history.length === 0) return;
    setLoadingAnalysis(true);
    try {
      const wTotal = history.length;
      const sTotal = history.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.filter(s => s.done).length, 0), 0);
      const prSummary = prs.slice(0, 5).map((p) => `${p.exerciseName}: ${p.maxLoad > 0 ? `${p.maxLoad}kg` : ''} ${p.maxReps} reps`).join(', ');
      const profileSummary = plan?.userProfile
        ? `${plan.userProfile.fitnessLevel}, objetivo ${plan.userProfile.goal}, ${plan.userProfile.daysPerWeek}x/semana`
        : 'não definido';
      const result = await analyzePerformance(wTotal, sTotal, prSummary, profileSummary);
      setAnalysis(result);
    } catch {
      setAnalysis('Não foi possível gerar a análise. Verifique sua conexão e tente novamente.');
    } finally {
      setLoadingAnalysis(false);
    }
  }, [history, prs, plan]);

  const totalWorkouts = history.length;
  const totalMinutes = Math.round(history.reduce((a, w) => a + w.durationSeconds, 0) / 60);
  const totalSets = history.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.filter(s => s.done).length, 0), 0);
  const totalVolume = history.reduce((a, w) =>
    a + w.exercises.reduce((b, e) =>
      b + e.sets.filter(s => s.done).reduce((c, set) => {
        const load = parseFloat(set.load) || 0;
        const reps = parseFloat(set.reps) || 0;
        return c + load * reps;
      }, 0), 0), 0);

  const maxWeekWorkouts = weeklyData.length > 0 ? Math.max(...weeklyData.map((w) => w.workouts), 1) : 1;
  const maxWeekVolume = weeklyData.length > 0 ? Math.max(...weeklyData.map((w) => w.totalVolume), 1) : 1;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Overview stats */}
        <View style={s.statsGrid}>
          {[
            { icon: '🏋️', label: 'Treinos', value: String(totalWorkouts) },
            { icon: '⏱', label: 'Horas', value: fmtDuration(totalWorkouts > 0 ? Math.round(history.reduce((a, w) => a + w.durationSeconds, 0)) : 0) },
            { icon: '🔁', label: 'Séries', value: String(totalSets) },
            { icon: '📦', label: 'Volume', value: totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${Math.round(totalVolume)}kg` },
          ].map((stat, i) => (
            <View key={i} style={s.statCard}>
              <Text style={s.statIcon}>{stat.icon}</Text>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Weekly frequency chart */}
        {weeklyData.length > 0 && (
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>📅 TREINOS POR SEMANA</Text>
            {weeklyData.map((week, i) => (
              <View key={i} style={s.barRow}>
                <Text style={s.barLabel}>{week.label}</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, {
                    width: (week.workouts / maxWeekWorkouts) * BAR_MAX_WIDTH,
                    backgroundColor: C.primary,
                    opacity: i === weeklyData.length - 1 ? 1 : 0.55,
                  }]} />
                </View>
                <Text style={s.barValue}>{week.workouts}×</Text>
              </View>
            ))}
          </View>
        )}

        {/* Weekly volume chart */}
        {weeklyData.length > 0 && weeklyData.some((w) => w.totalVolume > 0) && (
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>📦 VOLUME SEMANAL (kg·reps)</Text>
            {weeklyData.map((week, i) => (
              <View key={i} style={s.barRow}>
                <Text style={s.barLabel}>{week.label}</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, {
                    width: (week.totalVolume / maxWeekVolume) * BAR_MAX_WIDTH,
                    backgroundColor: C.success,
                    opacity: i === weeklyData.length - 1 ? 1 : 0.55,
                  }]} />
                </View>
                <Text style={[s.barValue, { color: C.success }]}>
                  {week.totalVolume >= 1000
                    ? `${(week.totalVolume / 1000).toFixed(1)}t`
                    : `${Math.round(week.totalVolume)}kg`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Personal records */}
        {prs.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🏆 Recordes Pessoais</Text>
            {prs.map((pr, i) => (
              <View key={i} style={[s.prRow, i === prs.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={s.prLeft}>
                  <Text style={s.prExercise} numberOfLines={1}>{pr.exerciseName}</Text>
                  <Text style={s.prDate}>{new Date(pr.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</Text>
                </View>
                <View style={s.prRight}>
                  {pr.maxLoad > 0 && (
                    <Text style={[s.prValue, { color: C.primary }]}>{pr.maxLoad.toFixed(0)}kg</Text>
                  )}
                  <Text style={[s.prValue, { color: C.success, marginLeft: 8 }]}>{pr.maxReps} reps</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* AI Analysis */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🤖 Análise de Desempenho</Text>
          {analysis ? (
            <Text style={s.analysisText}>{analysis}</Text>
          ) : (
            <Text style={s.analysisHint}>
              Obtenha uma análise personalizada do seu progresso, pontos fortes e áreas de melhoria gerada por IA.
            </Text>
          )}
          <TouchableOpacity
            style={[s.analyzeBtn, loadingAnalysis && { opacity: 0.6 }, history.length === 0 && { opacity: 0.4 }]}
            onPress={handleAnalyze}
            disabled={loadingAnalysis || history.length === 0}
          >
            {loadingAnalysis
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.analyzeBtnText}>🤖 {analysis ? 'Reanalisar' : 'Analisar agora'}</Text>}
          </TouchableOpacity>
          {history.length === 0 && (
            <Text style={s.analysisHint}>Complete treinos para liberar a análise.</Text>
          )}
        </View>

        {loading && (
          <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 32 }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  statCard: {
    width: (width - 40) / 2, backgroundColor: C.surface, borderRadius: 14,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { color: C.primary, fontSize: 20, fontWeight: '900' },
  statLabel: { color: C.text3, fontSize: 11, marginTop: 2 },

  chartCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  chartTitle: { color: C.text3, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  barLabel: { color: C.text3, fontSize: 11, width: 38 },
  barTrack: { flex: 1, height: 14, backgroundColor: C.elevated, borderRadius: 7, overflow: 'hidden' },
  barFill: { height: 14, borderRadius: 7 },
  barValue: { color: C.primaryLight, fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },

  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  cardTitle: { color: C.text1, fontSize: 15, fontWeight: '800', marginBottom: 12 },

  prRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  prLeft: { flex: 1, marginRight: 12 },
  prExercise: { color: C.text1, fontSize: 14, fontWeight: '600' },
  prDate: { color: C.text3, fontSize: 11, marginTop: 2 },
  prRight: { flexDirection: 'row', alignItems: 'center' },
  prValue: { fontSize: 14, fontWeight: '800' },

  analyzeBtn: {
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', marginTop: 14,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  analyzeBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  analysisText: { color: C.text2, fontSize: 14, lineHeight: 22 },
  analysisHint: { color: C.text3, fontSize: 13, lineHeight: 19, marginBottom: 4 },
});
