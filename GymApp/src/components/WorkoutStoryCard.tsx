import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CompletedWorkout } from '../types';

interface Props {
  workout: CompletedWorkout;
  avgHeartRate?: number;
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}min ${sec}s` : `${m}min`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function getBestLoad(workout: CompletedWorkout): number {
  let best = 0;
  for (const ex of workout.exercises)
    for (const set of ex.sets)
      if (set.done && set.load) { const v = parseFloat(set.load); if (v > best) best = v; }
  return best;
}

// 9:16 story card — 360×640 (scaled to device width when rendered)
export const WorkoutStoryCard = React.forwardRef<View, Props>(({ workout, avgHeartRate }, ref) => {
  const doneSets  = workout.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0);
  const bestLoad  = getBestLoad(workout);
  const topExs    = workout.exercises
    .filter(e => e.sets.some(s => s.done && s.load))
    .slice(0, 4);

  const stats = [
    { icon: '⏱', label: 'Duração',    value: fmtDuration(workout.durationSeconds) },
    { icon: '🔁', label: 'Séries',     value: `${doneSets}/${totalSets}` },
    { icon: '⬆️', label: 'Melhor Carga', value: bestLoad > 0 ? `${bestLoad}kg` : '—' },
    ...(avgHeartRate ? [{ icon: '❤️', label: 'BPM Médio', value: String(avgHeartRate) }] : []),
  ];

  return (
    <View ref={ref} style={s.card}>
      {/* Gradient-like top accent */}
      <View style={s.topAccent} />

      {/* Brand */}
      <View style={s.brand}>
        <Text style={s.brandText}>💪 GymAI</Text>
        <Text style={s.brandDate}>{fmtDate(workout.date)}</Text>
      </View>

      {/* Big focus text */}
      <View style={s.focusSection}>
        <Text style={s.focusLabel}>TREINO DO DIA</Text>
        <Text style={s.focusName}>{workout.focus}</Text>
        <Text style={s.focusDay}>{workout.dayOfWeek}</Text>
        <View style={s.doneBadge}>
          <Text style={s.doneBadgeText}>✓ CONCLUÍDO</Text>
        </View>
      </View>

      {/* Stats grid 2×2 */}
      <View style={s.statsGrid}>
        {stats.map((st, i) => (
          <View key={i} style={s.statBox}>
            <Text style={s.statIcon}>{st.icon}</Text>
            <Text style={s.statValue}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* Top exercises */}
      {topExs.length > 0 && (
        <View style={s.exSection}>
          <Text style={s.exSectionTitle}>CARGAS REGISTRADAS</Text>
          {topExs.map((ex, i) => {
            const loads = ex.sets.filter(s => s.done && s.load).map(s => `${s.load}kg`);
            return (
              <View key={i} style={s.exRow}>
                <Text style={s.exName} numberOfLines={1}>{ex.name}</Text>
                <Text style={s.exLoads}>{loads.join(' · ')}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Phase bar footer */}
      <View style={s.footer}>
        <View style={s.phaseBar}>
          {['#10B981','#3B82F6','#F59E0B','#EF4444'].map((c, i) => (
            <View key={i} style={[s.phaseSeg, { backgroundColor: c }]} />
          ))}
        </View>
        <Text style={s.footerText}>Compartilhado pelo GymAI · Powered by AI</Text>
      </View>
    </View>
  );
});

WorkoutStoryCard.displayName = 'WorkoutStoryCard';

const s = StyleSheet.create({
  card: {
    width: 360, height: 640,
    backgroundColor: '#0F0F1A',
    borderRadius: 0,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },

  topAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
    backgroundColor: '#7C3AED',
  },

  brand: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 0 },
  brandText: { color: '#A78BFA', fontSize: 20, fontWeight: '900' },
  brandDate: { color: '#475569', fontSize: 12, marginTop: 3 },

  focusSection: { paddingHorizontal: 24, paddingTop: 20 },
  focusLabel: { color: '#7C3AED', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  focusName: { color: '#F1F5F9', fontSize: 42, fontWeight: '900', lineHeight: 48, marginTop: 4 },
  focusDay: { color: '#475569', fontSize: 14, marginTop: 4 },
  doneBadge: {
    marginTop: 12, alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)',
  },
  doneBadgeText: { color: '#10B981', fontSize: 12, fontWeight: '800' },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 24, paddingTop: 20,
  },
  statBox: {
    width: '47%', backgroundColor: '#07070F',
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { color: '#7C3AED', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#475569', fontSize: 10, marginTop: 3 },

  exSection: { paddingHorizontal: 24, paddingTop: 12 },
  exSectionTitle: { color: '#475569', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  exRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1E1E30',
  },
  exName: { color: '#94A3B8', fontSize: 13, flex: 1, marginRight: 8 },
  exLoads: { color: '#10B981', fontSize: 12, fontWeight: '700' },

  footer: { paddingTop: 8 },
  phaseBar: { flexDirection: 'row', height: 4 },
  phaseSeg: { flex: 1, height: 4 },
  footerText: { color: '#475569', fontSize: 10, textAlign: 'center', paddingVertical: 10 },
});
