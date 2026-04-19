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

export const WorkoutSummaryCard = React.forwardRef<View, Props>(({ workout, avgHeartRate }, ref) => {
  const doneSets  = workout.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0);
  const bestLoad  = getBestLoad(workout);
  const topExs    = workout.exercises
    .filter(e => e.sets.some(s => s.done && s.load))
    .slice(0, 5);

  const stats = [
    { icon: '⏱',  label: 'Duração',     value: fmtDuration(workout.durationSeconds) },
    { icon: '💪',  label: 'Exercícios',  value: String(workout.exercises.length) },
    { icon: '🔁',  label: 'Séries',      value: `${doneSets}/${totalSets}` },
    { icon: '⬆️',  label: 'Melhor Carga',value: bestLoad > 0 ? `${bestLoad}kg` : '—' },
    ...(avgHeartRate ? [{ icon: '❤️', label: 'BPM Médio', value: String(avgHeartRate) }] : []),
  ];

  return (
    <View ref={ref} style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.brand}>💪 GymAI</Text>
          <Text style={s.date}>{fmtDate(workout.date)}</Text>
        </View>
        <View style={s.doneBadge}>
          <Text style={s.doneBadgeText}>TREINO{'\n'}CONCLUÍDO ✓</Text>
        </View>
      </View>

      {/* Workout title */}
      <Text style={s.workoutName}>{workout.focus}</Text>
      <Text style={s.workoutDay}>{workout.dayOfWeek}</Text>

      {/* Stats grid */}
      <View style={s.statsRow}>
        {stats.map((st, i) => (
          <View key={i} style={s.statBox}>
            <Text style={s.statIcon}>{st.icon}</Text>
            <Text style={s.statValue}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* Exercise loads */}
      {topExs.length > 0 && (
        <View style={s.exSection}>
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

      {/* Footer phase bar */}
      <View style={s.footer}>
        <View style={s.phaseBar}>
          {[['#10B981', 1], ['#3B82F6', 1], ['#F59E0B', 1], ['#EF4444', 1]].map(([c, f], i) => (
            <View key={i} style={[s.phaseSeg, { backgroundColor: c as string, flex: f as number }]} />
          ))}
        </View>
        <Text style={s.footerText}>Registrado no GymAI · Powered by AI</Text>
      </View>
    </View>
  );
});

WorkoutSummaryCard.displayName = 'WorkoutSummaryCard';

const s = StyleSheet.create({
  card: { width: 360, backgroundColor: '#0F0F1A', borderRadius: 20, overflow: 'hidden' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 20, paddingBottom: 14, backgroundColor: '#161625',
  },
  brand: { color: '#A78BFA', fontSize: 18, fontWeight: '900' },
  date: { color: '#475569', fontSize: 11, marginTop: 3 },
  doneBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 10, padding: 8,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  doneBadgeText: { color: '#10B981', fontSize: 9, fontWeight: '800', textAlign: 'center', lineHeight: 13 },

  workoutName: { color: '#F1F5F9', fontSize: 26, fontWeight: '900', paddingHorizontal: 20, paddingTop: 16 },
  workoutDay: { color: '#475569', fontSize: 12, paddingHorizontal: 20, marginBottom: 14 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  statBox: {
    backgroundColor: '#07070F', borderRadius: 12, padding: 10,
    alignItems: 'center', minWidth: 80, flex: 1,
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { color: '#7C3AED', fontSize: 16, fontWeight: '900' },
  statLabel: { color: '#475569', fontSize: 9, marginTop: 2 },

  exSection: { paddingHorizontal: 20, paddingBottom: 12, gap: 4 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1E1E30' },
  exName: { color: '#94A3B8', fontSize: 13, flex: 1, marginRight: 10 },
  exLoads: { color: '#10B981', fontSize: 12, fontWeight: '700' },

  footer: { paddingTop: 10 },
  phaseBar: { flexDirection: 'row', height: 4 },
  phaseSeg: { height: 4 },
  footerText: { color: '#475569', fontSize: 10, textAlign: 'center', paddingVertical: 8 },
});
