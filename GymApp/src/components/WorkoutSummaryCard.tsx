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

function getTotalVolume(workout: CompletedWorkout): number {
  let vol = 0;
  for (const ex of workout.exercises)
    for (const set of ex.sets)
      if (set.done && set.load && set.reps) {
        vol += parseFloat(set.load) * parseInt(set.reps, 10);
      }
  return Math.round(vol);
}

export const WorkoutSummaryCard = React.forwardRef<View, Props>(({ workout, avgHeartRate }, ref) => {
  const doneSets  = workout.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0);
  const bestLoad  = getBestLoad(workout);
  const totalVol  = getTotalVolume(workout);
  const progress  = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  const allExercises = workout.exercises.filter(e => e.sets.some(s => s.done));

  const stats = [
    { icon: '⏱',  label: 'Duração',     value: fmtDuration(workout.durationSeconds) },
    { icon: '💪',  label: 'Exercícios',  value: String(workout.exercises.length) },
    { icon: '🔁',  label: 'Séries',      value: `${doneSets}/${totalSets}` },
    { icon: '⬆️',  label: 'Melhor Carga',value: bestLoad > 0 ? `${bestLoad}kg` : '—' },
    ...(totalVol > 0 ? [{ icon: '📊', label: 'Volume Total', value: `${totalVol}kg` }] : []),
    ...(avgHeartRate ? [{ icon: '❤️', label: 'BPM Médio', value: String(avgHeartRate) }] : []),
  ];

  return (
    <View ref={ref} style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
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

      {/* Progress bar */}
      <View style={s.progressWrap}>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={s.progressText}>{progress}% completo</Text>
      </View>

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

      {/* Exercise details with loads */}
      {allExercises.length > 0 && (
        <View style={s.exSection}>
          <Text style={s.exTitle}>EXERCÍCIOS REALIZADOS</Text>
          {allExercises.map((ex, i) => {
            const exDone = ex.sets.filter(s => s.done).length;
            const loads = ex.sets
              .filter(s => s.done && s.load)
              .map(s => `${s.load}kg×${s.reps || '?'}`);
            return (
              <View key={i} style={s.exRow}>
                <View style={s.exLeft}>
                  <Text style={s.exName} numberOfLines={1}>{ex.name}</Text>
                  <Text style={s.exSets}>{exDone}/{ex.targetSets} séries</Text>
                </View>
                {loads.length > 0 && (
                  <Text style={s.exLoads} numberOfLines={1}>{loads.join(' · ')}</Text>
                )}
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
  headerLeft: { flex: 1 },
  brand: { color: '#A78BFA', fontSize: 18, fontWeight: '900' },
  date: { color: '#475569', fontSize: 11, marginTop: 3 },
  doneBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 10, padding: 8,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  doneBadgeText: { color: '#10B981', fontSize: 9, fontWeight: '800', textAlign: 'center', lineHeight: 13 },

  workoutName: { color: '#F1F5F9', fontSize: 26, fontWeight: '900', paddingHorizontal: 20, paddingTop: 16 },
  workoutDay: { color: '#475569', fontSize: 12, paddingHorizontal: 20, marginBottom: 10 },

  progressWrap: { paddingHorizontal: 20, marginBottom: 14 },
  progressTrack: { height: 6, backgroundColor: '#161625', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#10B981', borderRadius: 3 },
  progressText: { color: '#10B981', fontSize: 10, fontWeight: '700', marginTop: 4 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  statBox: {
    backgroundColor: '#07070F', borderRadius: 12, padding: 10,
    alignItems: 'center', minWidth: 80, flex: 1,
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { color: '#7C3AED', fontSize: 16, fontWeight: '900' },
  statLabel: { color: '#475569', fontSize: 9, marginTop: 2 },

  exSection: { paddingHorizontal: 20, paddingBottom: 12, gap: 2 },
  exTitle: { color: '#475569', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1E1E30' },
  exLeft: { flex: 1, marginRight: 8 },
  exName: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  exSets: { color: '#475569', fontSize: 10, marginTop: 1 },
  exLoads: { color: '#10B981', fontSize: 11, fontWeight: '700', maxWidth: 140, textAlign: 'right' },

  footer: { paddingTop: 10 },
  phaseBar: { flexDirection: 'row', height: 4 },
  phaseSeg: { height: 4 },
  footerText: { color: '#475569', fontSize: 10, textAlign: 'center', paddingVertical: 8 },
});
