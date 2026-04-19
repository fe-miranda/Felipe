import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadHistory } from '../services/workoutHistoryService';
import {
  BACK_MUSCLE_GROUPS,
  computeMuscleFatigue,
  FRONT_MUSCLE_GROUPS,
  MuscleFatigue,
} from '../services/muscleService';

const C = {
  bg: '#07070F',
  surface: '#0F0F1A',
  border: '#1E1E30',
  text1: '#F1F5F9',
  text2: '#94A3B8',
  text3: '#475569',
};

function fatigueColor(v: number): string {
  if (v < 35) return '#10B981';
  if (v < 70) return '#F59E0B';
  return '#EF4444';
}

function lastTrainedLabel(days: number | null): string {
  if (days === null) return 'Sem treino recente';
  if (days === 0) return 'Treinado hoje';
  if (days === 1) return 'Treinado ontem';
  return `Há ${days} dias`;
}

export function MuscleFatigueScreen() {
  const [data, setData] = useState<MuscleFatigue[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadHistory().then((history) => setData(computeMuscleFatigue(history)));
  }, []);

  const front = useMemo(() => data.filter((d) => FRONT_MUSCLE_GROUPS.includes(d.group)), [data]);
  const back = useMemo(() => data.filter((d) => BACK_MUSCLE_GROUPS.includes(d.group)), [data]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Text style={s.title}>Fadiga Muscular</Text>
        <Text style={s.subtitle}>Últimos 7 dias · 0-100</Text>

        <View style={s.silhouetteWrap}>
          <View style={s.silhouetteCard}>
            <Text style={s.silhouetteTitle}>Frente</Text>
            {front.map((g) => (
              <View key={g.group} style={s.silhouetteRow}>
                <Text style={s.silhouetteLabel}>{g.group}</Text>
                <View style={s.silhouetteBarTrack}>
                  <View style={[s.silhouetteBarFill, { width: `${g.fatigue}%`, backgroundColor: fatigueColor(g.fatigue) }]} />
                </View>
              </View>
            ))}
          </View>
          <View style={s.silhouetteCard}>
            <Text style={s.silhouetteTitle}>Costas</Text>
            {back.map((g) => (
              <View key={g.group} style={s.silhouetteRow}>
                <Text style={s.silhouetteLabel}>{g.group}</Text>
                <View style={s.silhouetteBarTrack}>
                  <View style={[s.silhouetteBarFill, { width: `${g.fatigue}%`, backgroundColor: fatigueColor(g.fatigue) }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.sectionTitle}>Detalhes por grupo</Text>
        {data.map((item) => {
          const open = expanded === item.group;
          return (
            <TouchableOpacity
              key={item.group}
              style={s.row}
              onPress={() => setExpanded(open ? null : item.group)}
              activeOpacity={0.8}
            >
              <View style={s.rowTop}>
                <Text style={s.rowName}>{item.group}</Text>
                <Text style={[s.rowValue, { color: fatigueColor(item.fatigue) }]}>{item.fatigue}%</Text>
              </View>
              {open && (
                <Text style={s.rowMeta}>{lastTrainedLabel(item.lastTrainedDays)}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 12 },
  title: { color: C.text1, fontSize: 24, fontWeight: '800' },
  subtitle: { color: C.text3, fontSize: 12, marginTop: -6 },
  silhouetteWrap: { gap: 10 },
  silhouetteCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  silhouetteTitle: { color: C.text1, fontSize: 16, fontWeight: '700' },
  silhouetteRow: { gap: 4 },
  silhouetteLabel: { color: C.text2, fontSize: 12 },
  silhouetteBarTrack: { height: 8, borderRadius: 4, backgroundColor: '#1A1A2A', overflow: 'hidden' },
  silhouetteBarFill: { height: 8, borderRadius: 4 },
  sectionTitle: { color: C.text1, fontSize: 16, fontWeight: '700', marginTop: 4 },
  row: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { color: C.text2, fontSize: 14, fontWeight: '600' },
  rowValue: { fontSize: 15, fontWeight: '800' },
  rowMeta: { color: C.text3, fontSize: 12, marginTop: 8 },
});
