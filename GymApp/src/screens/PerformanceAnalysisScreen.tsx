import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Polyline, Circle as SvgCircle, G, Text as SvgText, Line, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, CompletedWorkout } from '../types';
import { usePlan } from '../hooks/usePlan';
import { loadHistory } from '../services/workoutHistoryService';
import { loadPersonalRecords, PersonalRecord } from '../services/personalRecordsService';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'PerformanceAnalysis'> };

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA', primaryGlow: 'rgba(124,58,237,0.15)',
  success: '#10B981', warning: '#F59E0B',
  text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

const CHART_W = 300;
const LINE_H = 100;

function EvolutionChart({ history }: { history: CompletedWorkout[] }) {
  const data = history.slice(-10).map(w => w.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0));
  if (data.length < 2) return <Text style={{ color: C.text3, textAlign: 'center', paddingVertical: 20 }}>Treine mais para ver o gráfico</Text>;
  const maxVal = Math.max(...data, 1);
  const stepX = CHART_W / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${LINE_H - (v / maxVal) * (LINE_H - 10)}`).join(' ');

  return (
    <Svg width={CHART_W} height={LINE_H + 20}>
      <Line x1={0} y1={LINE_H} x2={CHART_W} y2={LINE_H} stroke={C.border} strokeWidth={1} />
      <Polyline points={points} fill="none" stroke={C.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => (
        <G key={i}>
          <SvgCircle cx={i * stepX} cy={LINE_H - (v / maxVal) * (LINE_H - 10)} r={4} fill={C.primary} />
          <SvgText x={i * stepX} y={LINE_H + 14} fill={C.text3} fontSize={8} textAnchor="middle">{v}</SvgText>
        </G>
      ))}
    </Svg>
  );
}

function MuscleBalanceChart({ history }: { history: CompletedWorkout[] }) {
  const counts: Record<string, number> = {};
  for (const w of history) {
    for (const ex of w.exercises) {
      if (!ex.sets.some(s => s.done)) continue;
      const focus = w.focus || 'Geral';
      counts[focus] = (counts[focus] || 0) + 1;
    }
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!entries.length) return <Text style={{ color: C.text3, textAlign: 'center', paddingVertical: 20 }}>Sem dados suficientes</Text>;
  const maxVal = Math.max(...entries.map(e => e[1]), 1);
  const BAR_H = 16;
  const GAP = 8;

  return (
    <Svg width={CHART_W} height={entries.length * (BAR_H + GAP) + 4}>
      {entries.map(([label, count], i) => {
        const w = (count / maxVal) * (CHART_W - 80);
        const y = i * (BAR_H + GAP);
        return (
          <G key={label}>
            <SvgText x={0} y={y + BAR_H - 3} fill={C.text2} fontSize={9}>{label.slice(0, 14)}</SvgText>
            <Rect x={80} y={y} width={w} height={BAR_H} rx={4} fill={C.primary} opacity={0.8} />
            <SvgText x={82 + w} y={y + BAR_H - 3} fill={C.primaryLight} fontSize={9} fontWeight="700">{count}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export function PerformanceAnalysisScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { plan } = usePlan();
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);

  useEffect(() => {
    Promise.all([loadHistory(), loadPersonalRecords()]).then(([hist, prs]) => {
      setHistory(hist);
      setRecords(prs);
    });
  }, []);

  // Compute stats
  const totalSessions = history.length;
  const now = new Date();
  const last30 = history.filter(w => {
    const d = new Date(w.date);
    return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= 30;
  }).length;
  const totalSets = history.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.filter(s => s.done).length, 0), 0);
  const consistency = plan ? Math.min(100, Math.round((totalSessions / Math.max(1, plan.userProfile.daysPerWeek * 4)) * 100)) : 0;

  // Most worked muscle
  const muscleCounts: Record<string, number> = {};
  for (const w of history) {
    for (const ex of w.exercises) {
      if (!ex.sets.some(s => s.done)) continue;
      muscleCounts[w.focus] = (muscleCounts[w.focus] || 0) + 1;
    }
  }
  const topMuscle = Object.entries(muscleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const analyses = [
    `Você treinou ${totalSessions} ${totalSessions === 1 ? 'vez' : 'vezes'} no total`,
    `Nos últimos 30 dias: ${last30} treinos`,
    `Seu foco mais trabalhado foi ${topMuscle}`,
    `Total de séries completadas: ${totalSets}`,
    `Sua consistência está em ${consistency}%`,
    records.length > 0 ? `Você tem ${records.length} record${records.length > 1 ? 'es' : ''} pessoal${records.length > 1 ? 'is' : ''}` : 'Complete treinos com carga para ver records',
  ];

  return (
    <ScrollView style={sty.container} contentContainerStyle={[sty.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
      <Text style={sty.screenTitle}>📊 Análise de Desempenho</Text>
      {plan && <Text style={sty.userName}>{plan.userProfile.name}</Text>}

      {/* Stats row */}
      <View style={sty.statsRow}>
        {[
          { icon: '🏋️', value: String(totalSessions), label: 'Treinos' },
          { icon: '💪', value: String(totalSets), label: 'Séries' },
          { icon: '🎯', value: `${consistency}%`, label: 'Consistência' },
          { icon: '🔥', value: String(last30), label: 'Últimos 30d' },
        ].map((s, i) => (
          <View key={i} style={sty.statCard}>
            <Text style={sty.statIcon}>{s.icon}</Text>
            <Text style={sty.statValue}>{s.value}</Text>
            <Text style={sty.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Evolution chart */}
      <View style={sty.card}>
        <Text style={sty.cardTitle}>📈 Evolução de Volume (séries por treino)</Text>
        <View style={sty.chartWrap}>
          <EvolutionChart history={history} />
        </View>
      </View>

      {/* Muscle balance */}
      <View style={sty.card}>
        <Text style={sty.cardTitle}>💪 Equilíbrio Muscular</Text>
        <View style={sty.chartWrap}>
          <MuscleBalanceChart history={history} />
        </View>
      </View>

      {/* AI-like analysis */}
      <View style={sty.card}>
        <Text style={sty.cardTitle}>🤖 Análise Inteligente</Text>
        {analyses.map((a, i) => (
          <View key={i} style={sty.analysisRow}>
            <View style={sty.analysisDot} />
            <Text style={sty.analysisText}>{a}</Text>
          </View>
        ))}
      </View>

      {/* Personal Records */}
      {records.length > 0 && (
        <View style={sty.card}>
          <Text style={sty.cardTitle}>🏆 Records Pessoais</Text>
          <View style={sty.recordsGrid}>
            {records.slice(0, 8).map((r) => (
              <View key={r.exerciseName} style={sty.recordCard}>
                <Text style={sty.recordName} numberOfLines={2}>{r.exerciseName}</Text>
                <Text style={sty.recordLoad}>{r.maxLoad > 0 ? `${Math.round(r.maxLoad)}kg` : '—'}</Text>
                <Text style={sty.recordReps}>{r.maxReps} reps</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity style={sty.backBtn} onPress={() => navigation.goBack()}>
        <Text style={sty.backBtnText}>← Voltar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const sty = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 14 },
  screenTitle: { color: C.text1, fontSize: 22, fontWeight: '900', marginBottom: 2 },
  userName: { color: C.primaryLight, fontSize: 14, fontWeight: '700', marginBottom: 12 },

  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { color: C.primary, fontSize: 18, fontWeight: '900' },
  statLabel: { color: C.text3, fontSize: 9, marginTop: 2, textAlign: 'center' },

  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  cardTitle: { color: C.text1, fontSize: 15, fontWeight: '800', marginBottom: 14 },
  chartWrap: { alignItems: 'center' },

  analysisRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  analysisDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginTop: 6 },
  analysisText: { color: C.text2, fontSize: 13, lineHeight: 20, flex: 1 },

  recordsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recordCard: { backgroundColor: C.elevated, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border, width: '47%', alignItems: 'center' },
  recordName: { color: C.text2, fontSize: 11, textAlign: 'center', marginBottom: 6 },
  recordLoad: { color: C.success, fontSize: 20, fontWeight: '900' },
  recordReps: { color: C.text3, fontSize: 11, marginTop: 2 },

  backBtn: { backgroundColor: C.elevated, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  backBtnText: { color: C.primaryLight, fontWeight: '700', fontSize: 14 },
});
