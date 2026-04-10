import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { usePlan } from '../hooks/usePlan';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WorkoutDetail'>;
  route: RouteProp<RootStackParamList, 'WorkoutDetail'>;
};

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA', primaryGlow: 'rgba(124,58,237,0.15)',
  text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

const PHASE_COLOR = (mi: number) => {
  if (mi < 3) return '#10B981';
  if (mi < 6) return '#3B82F6';
  if (mi < 9) return '#F59E0B';
  return '#EF4444';
};

export function WorkoutDetailScreen({ route }: Props) {
  const { monthIndex, weekIndex, dayIndex } = route.params;
  const { plan, loadStoredPlan } = usePlan();
  const insets = useSafeAreaInsets();

  useEffect(() => { loadStoredPlan(); }, []);
  if (!plan) return null;

  const month = plan.monthlyBlocks[monthIndex];
  const week  = month.weeks[weekIndex];
  const day   = week.days[dayIndex];
  const phaseColor = PHASE_COLOR(monthIndex);

  const totalSets = day.exercises.reduce((a, e) => a + e.sets, 0);

  return (
    <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={[s.header, { borderColor: `${phaseColor}40` }]}>
        <Text style={[s.breadcrumb, { color: phaseColor }]}>
          {month.monthName} · Sem {week.week}
        </Text>
        <Text style={s.dayName}>{day.dayOfWeek}</Text>
        <View style={[s.focusPill, { backgroundColor: `${phaseColor}20` }]}>
          <Text style={[s.focusText, { color: phaseColor }]}>{day.focus}</Text>
        </View>

        {/* Summary stats */}
        <View style={s.headerStats}>
          {[
            { icon: '⏱', label: 'duração',    value: `${day.duration} min` },
            { icon: '💪', label: 'exercícios', value: String(day.exercises.length) },
            { icon: '🔁', label: 'séries',     value: String(totalSets) },
          ].map((stat, i) => (
            <View key={i} style={s.statItem}>
              <Text style={s.statIcon}>{stat.icon}</Text>
              <Text style={[s.statValue, { color: phaseColor }]}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Day notes ── */}
      {day.notes && (
        <View style={s.notesCard}>
          <Text style={s.notesTitle}>📝 Observações</Text>
          <Text style={s.notesText}>{day.notes}</Text>
        </View>
      )}

      {/* ── Exercise list ── */}
      <Text style={s.sectionTitle}>Exercícios</Text>

      {day.exercises.map((ex, idx) => (
        <View key={idx} style={s.exCard}>
          {/* Number badge */}
          <View style={s.exHeader}>
            <View style={[s.exNumBadge, { backgroundColor: phaseColor }]}>
              <Text style={s.exNumText}>{idx + 1}</Text>
            </View>
            <Text style={s.exName}>{ex.name}</Text>
          </View>

          {/* Stats bar */}
          <View style={[s.statsBar, { backgroundColor: C.elevated }]}>
            <View style={s.barStat}>
              <Text style={[s.barValue, { color: phaseColor }]}>{ex.sets}</Text>
              <Text style={s.barLabel}>Séries</Text>
            </View>
            <View style={s.barDiv} />
            <View style={s.barStat}>
              <Text style={[s.barValue, { color: phaseColor }]}>{ex.reps}</Text>
              <Text style={s.barLabel}>Reps</Text>
            </View>
            <View style={s.barDiv} />
            <View style={s.barStat}>
              <Text style={[s.barValue, { color: phaseColor }]}>{ex.rest}</Text>
              <Text style={s.barLabel}>Descanso</Text>
            </View>
          </View>

          {ex.notes && (
            <View style={s.exNote}>
              <Text style={s.exNoteText}>💡 {ex.notes}</Text>
            </View>
          )}
        </View>
      ))}

      {/* ── Summary card ── */}
      <View style={[s.summaryCard, { borderColor: `${phaseColor}30` }]}>
        <Text style={[s.summaryTitle, { color: phaseColor }]}>📊 Resumo do Treino</Text>
        {[
          { label: 'Duração estimada',  value: `${day.duration} min` },
          { label: 'Total exercícios',  value: String(day.exercises.length) },
          { label: 'Total de séries',   value: String(totalSets) },
          { label: 'Foco muscular',     value: day.focus },
        ].map((row, i, arr) => (
          <View key={i} style={[s.summaryRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={s.summaryLabel}>{row.label}</Text>
            <Text style={s.summaryValue}>{row.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 50 },

  header: {
    backgroundColor: C.surface, borderRadius: 20, padding: 22, marginBottom: 14,
    borderWidth: 1, alignItems: 'center',
  },
  breadcrumb: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  dayName: { color: C.text1, fontSize: 32, fontWeight: '900' },
  focusPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 10, marginBottom: 16 },
  focusText: { fontSize: 13, fontWeight: '700' },
  headerStats: { flexDirection: 'row', gap: 20 },
  statItem: { alignItems: 'center', gap: 2 },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { color: C.text3, fontSize: 10 },

  notesCard: { backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  notesTitle: { color: C.text1, fontWeight: '700', fontSize: 14, marginBottom: 8 },
  notesText: { color: C.text2, lineHeight: 20 },

  sectionTitle: { color: C.text1, fontSize: 16, fontWeight: '700', marginBottom: 12 },

  exCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  exHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  exNumBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  exNumText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  exName: { color: C.text1, fontWeight: '700', fontSize: 16, flex: 1 },
  statsBar: { flexDirection: 'row', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  barStat: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 22, fontWeight: '900' },
  barLabel: { color: C.text3, fontSize: 11, marginTop: 2 },
  barDiv: { width: 1, height: 36, backgroundColor: C.border },
  exNote: { backgroundColor: C.elevated, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border },
  exNoteText: { color: C.primaryLight, fontSize: 13, lineHeight: 18 },

  summaryCard: { backgroundColor: C.surface, borderRadius: 16, padding: 18, marginTop: 8, borderWidth: 1 },
  summaryTitle: { fontWeight: '700', fontSize: 15, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  summaryLabel: { color: C.text2, fontSize: 14 },
  summaryValue: { color: C.text1, fontWeight: '700', fontSize: 14 },
});
