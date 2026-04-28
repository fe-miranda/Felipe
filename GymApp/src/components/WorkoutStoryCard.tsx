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

// 9:16 story card — 360×640 (scaled to device width when rendered)
export const WorkoutStoryCard = React.forwardRef<View, Props>(({ workout, avgHeartRate }, ref) => {
  const doneSets  = workout.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0);
  const bestLoad  = getBestLoad(workout);
  const totalVol  = getTotalVolume(workout);
  const progress  = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  const topExs    = workout.exercises
    .filter(e => e.sets.some(s => s.done))
    .slice(0, 5);

  const stats = [
    { icon: '⏱', label: 'Duração',    value: fmtDuration(workout.durationSeconds) },
    { icon: '🔁', label: 'Séries',     value: `${doneSets}/${totalSets}` },
    { icon: '⬆️', label: 'Melhor Carga', value: bestLoad > 0 ? `${bestLoad}kg` : '—' },
    ...(totalVol > 0 ? [{ icon: '📊', label: 'Volume', value: `${totalVol}kg` }] : []),
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

      {/* Progress bar */}
      <View style={s.progressWrap}>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={s.progressText}>{progress}% completo · {doneSets}/{totalSets} séries</Text>
      </View>

      {/* Stats grid 2×2 */}
      <View style={s.statsGrid}>
        {stats.slice(0, 4).map((st, i) => (
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
          <Text style={s.exSectionTitle}>EXERCÍCIOS REALIZADOS</Text>
          {topExs.map((ex, i) => {
            const exDone = ex.sets.filter(s => s.done).length;
            const loads = ex.sets.filter(s => s.done && s.load).map(s => `${s.load}kg`);
            return (
              <View key={i} style={s.exRow}>
                <Text style={s.exName} numberOfLines={1}>{ex.name}</Text>
                <Text style={s.exLoads}>
                  {loads.length > 0 ? loads.join(' · ') : `${exDone}/${ex.targetSets}`}
                </Text>
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

  focusSection: { paddingHorizontal: 24, paddingTop: 16 },
  focusLabel: { color: '#7C3AED', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  focusName: { color: '#F1F5F9', fontSize: 36, fontWeight: '900', lineHeight: 42, marginTop: 4 },
  focusDay: { color: '#475569', fontSize: 14, marginTop: 4 },
  doneBadge: {
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)',
  },
  doneBadgeText: { color: '#10B981', fontSize: 12, fontWeight: '800' },

  progressWrap: { paddingHorizontal: 24, paddingTop: 12 },
  progressTrack: { height: 6, backgroundColor: '#161625', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#10B981', borderRadius: 3 },
  progressText: { color: '#10B981', fontSize: 10, fontWeight: '700', marginTop: 4 },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 24, paddingTop: 12,
  },
  statBox: {
    width: '47%', backgroundColor: '#07070F',
    borderRadius: 14, padding: 12, alignItems: 'center',
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { color: '#7C3AED', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#475569', fontSize: 10, marginTop: 3 },

  exSection: { paddingHorizontal: 24, paddingTop: 10 },
  exSectionTitle: { color: '#475569', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  exRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1E1E30',
  },
  exName: { color: '#94A3B8', fontSize: 12, flex: 1, marginRight: 8 },
  exLoads: { color: '#10B981', fontSize: 11, fontWeight: '700' },

  footer: { paddingTop: 6 },
  phaseBar: { flexDirection: 'row', height: 4 },
  phaseSeg: { flex: 1, height: 4 },
  footerText: { color: '#475569', fontSize: 10, textAlign: 'center', paddingVertical: 10 },
});
