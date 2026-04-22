import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, G, Line } from 'react-native-svg';
import { CompletedWorkout } from '../types';

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA',
  success: '#10B981',
  text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  history: CompletedWorkout[];
}

interface SessionData {
  date: string;
  maxLoad: number;
  maxReps: number;
  sets: number;
}

function getSessionsForExercise(exerciseName: string, history: CompletedWorkout[]): SessionData[] {
  const results: SessionData[] = [];
  const lowerName = exerciseName.toLowerCase();
  for (const workout of history) {
    const ex = workout.exercises.find(e => e.name.toLowerCase().includes(lowerName) || lowerName.includes(e.name.toLowerCase().split(' ')[0]?.toLowerCase() ?? ''));
    if (!ex) continue;
    let maxLoad = 0;
    let maxReps = 0;
    for (const set of ex.sets) {
      if (!set.done) continue;
      const load = parseFloat(set.load);
      if (!isNaN(load) && load > maxLoad) maxLoad = load;
      const reps = parseInt(set.reps, 10);
      if (!isNaN(reps) && reps > maxReps) maxReps = reps;
    }
    results.push({
      date: workout.date,
      maxLoad,
      maxReps,
      sets: ex.sets.filter(s => s.done).length,
    });
  }
  return results.sort((a, b) => a.date.localeCompare(b.date));
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const CHART_W = 280;
const CHART_H = 100;
const BAR_GAP = 4;

function BarChart({ sessions }: { sessions: SessionData[] }) {
  const data = sessions.slice(-8);
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(s => s.maxLoad), 1);
  const barW = (CHART_W - BAR_GAP * (data.length + 1)) / data.length;

  return (
    <Svg width={CHART_W} height={CHART_H + 20}>
      {/* Horizontal grid lines */}
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <Line
          key={i}
          x1={0} y1={CHART_H * (1 - f)}
          x2={CHART_W} y2={CHART_H * (1 - f)}
          stroke={C.border} strokeWidth={0.5}
        />
      ))}
      <G>
        {data.map((s, i) => {
          const h = Math.max(4, (s.maxLoad / maxVal) * CHART_H);
          const x = BAR_GAP + i * (barW + BAR_GAP);
          const y = CHART_H - h;
          return (
            <G key={i}>
              <Rect x={x} y={y} width={barW} height={h} rx={3} fill={C.primary} opacity={0.85} />
              <SvgText
                x={x + barW / 2} y={CHART_H + 14}
                fill={C.text3} fontSize={8} textAnchor="middle"
              >
                {fmtDate(s.date)}
              </SvgText>
              {s.maxLoad > 0 && (
                <SvgText
                  x={x + barW / 2} y={y - 3}
                  fill={C.primaryLight} fontSize={8} textAnchor="middle" fontWeight="700"
                >
                  {s.maxLoad}
                </SvgText>
              )}
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

export function ExerciseHistoryModal({ visible, onClose, exerciseName, history }: Props) {
  const sessions = getSessionsForExercise(exerciseName, history);
  const recent = sessions.slice(-5).reverse();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={sty.overlay} activeOpacity={1} onPress={onClose}>
        <View style={sty.sheet} onStartShouldSetResponder={() => true}>
          <View style={sty.handle} />
          <View style={sty.titleRow}>
            <Text style={sty.title} numberOfLines={1}>📊 {exerciseName}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={sty.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {sessions.length === 0 ? (
            <View style={sty.empty}>
              <Text style={sty.emptyEmoji}>📭</Text>
              <Text style={sty.emptyText}>Nenhum histórico para este exercício</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={sty.sectionLabel}>Carga máxima (kg) — últimas 8 sessões</Text>
              <View style={sty.chartWrap}>
                <BarChart sessions={sessions} />
              </View>

              <Text style={sty.sectionLabel}>Histórico recente</Text>
              {recent.map((s, i) => (
                <View key={i} style={sty.row}>
                  <Text style={sty.rowDate}>{fmtDate(s.date)}</Text>
                  <View style={sty.rowRight}>
                    {s.maxLoad > 0 && (
                      <Text style={sty.rowLoad}>{s.maxLoad}kg</Text>
                    )}
                    {s.maxReps > 0 && (
                      <Text style={sty.rowReps}>{s.maxReps} reps</Text>
                    )}
                    <Text style={sty.rowSets}>{s.sets} séries</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const sty = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '75%', borderWidth: 1, borderColor: C.border,
  },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { color: C.text1, fontSize: 17, fontWeight: '800', flex: 1 },
  closeBtn: { color: C.text3, fontSize: 18, padding: 4 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: C.text2, fontSize: 14, textAlign: 'center' },
  sectionLabel: { color: C.text3, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 },
  chartWrap: { alignItems: 'center', marginBottom: 20 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rowDate: { color: C.text2, fontSize: 13 },
  rowRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  rowLoad: { color: C.success, fontWeight: '800', fontSize: 13 },
  rowReps: { color: C.primaryLight, fontWeight: '700', fontSize: 13 },
  rowSets: { color: C.text3, fontSize: 12 },
});
