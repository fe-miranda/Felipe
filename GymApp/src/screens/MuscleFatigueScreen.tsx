import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, CompletedWorkout } from '../types';
import { loadHistory } from '../services/workoutHistoryService';
import { calculateFatigue, fatigueColor, fatigueLabel, FatigueScore } from '../services/muscleService';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'MuscleFatigue'> };

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA',
  text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

function daysAgoLabel(d: number | null): string {
  if (d === null) return 'Nunca treinado';
  if (d === 0) return 'Hoje';
  if (d === 1) return 'Ontem';
  return `Há ${d} dias`;
}

export function MuscleFatigueScreen({ navigation }: Props) {
  const [scores, setScores] = useState<FatigueScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<CompletedWorkout[]>([]);

  useEffect(() => {
    loadHistory().then((hist) => {
      setHistory(hist);
      setScores(calculateFatigue(hist));
      setLoading(false);
    });
  }, []);

  const recoveredCount = scores.filter(s => s.score < 34).length;
  const fatiguedCount  = scores.filter(s => s.score >= 67).length;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.heroCard}>
          <Text style={s.heroTitle}>🔥 Fadiga Muscular</Text>
          <Text style={s.heroSub}>Baseado nos últimos 7 dias de treino</Text>
          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{history.length}</Text>
              <Text style={s.heroStatLabel}>treinos</Text>
            </View>
            <View style={s.heroStat}>
              <Text style={[s.heroStatNum, { color: '#10B981' }]}>{recoveredCount}</Text>
              <Text style={s.heroStatLabel}>recuperados</Text>
            </View>
            <View style={s.heroStat}>
              <Text style={[s.heroStatNum, { color: '#EF4444' }]}>{fatiguedCount}</Text>
              <Text style={s.heroStatLabel}>fatigados</Text>
            </View>
          </View>
        </View>

        {/* Legend */}
        <View style={s.legendRow}>
          {[['#10B981', 'Recuperado (0–33%)'], ['#F59E0B', 'Moderado (34–66%)'], ['#EF4444', 'Fatigado (67–100%)']].map(([c, l]) => (
            <View key={l} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: c as string }]} />
              <Text style={s.legendText}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Muscle group cards */}
        {loading ? (
          <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 40 }} />
        ) : scores.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>📊</Text>
            <Text style={s.emptyText}>Nenhum dado ainda. Complete treinos para ver sua fadiga muscular.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.goBack()}>
              <Text style={s.emptyBtnText}>Iniciar Treino</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.groupList}>
            {scores.map((sc) => {
              const color = fatigueColor(sc.score);
              const label = fatigueLabel(sc.score);
              return (
                <View key={sc.group} style={s.groupCard}>
                  <View style={s.groupTop}>
                    <Text style={s.groupName}>{sc.group}</Text>
                    <View style={[s.groupBadge, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
                      <Text style={[s.groupBadgeText, { color }]}>{label}</Text>
                    </View>
                  </View>

                  {/* Score bar */}
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${sc.score}%`, backgroundColor: color }]} />
                  </View>

                  <View style={s.groupBottom}>
                    <Text style={s.groupScore}>{sc.score}%</Text>
                    <Text style={s.groupLast}>{daysAgoLabel(sc.lastDaysAgo)}</Text>
                    {sc.totalSets > 0 && (
                      <Text style={s.groupSets}>{sc.totalSets} séries esta semana</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={s.disclaimer}>
          * O score é estimado pelo volume de séries e recência dos treinos nos últimos 7 dias.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 32 },

  heroCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  heroTitle: { color: C.text1, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  heroSub: { color: C.text3, fontSize: 12, marginBottom: 16 },
  heroStats: { flexDirection: 'row', gap: 20 },
  heroStat: { alignItems: 'center' },
  heroStatNum: { color: C.primaryLight, fontSize: 28, fontWeight: '900' },
  heroStatLabel: { color: C.text3, fontSize: 11, marginTop: 2 },

  legendRow: { gap: 6, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: C.text3, fontSize: 12 },

  groupList: { gap: 10 },
  groupCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  groupTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  groupName: { color: C.text1, fontSize: 16, fontWeight: '700' },
  groupBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  groupBadgeText: { fontSize: 11, fontWeight: '700' },

  barTrack: { height: 8, backgroundColor: C.elevated, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: 8, borderRadius: 4 },

  groupBottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupScore: { color: C.text2, fontSize: 13, fontWeight: '800', minWidth: 36 },
  groupLast: { color: C.text3, fontSize: 12, flex: 1 },
  groupSets: { color: C.primaryLight, fontSize: 11, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: C.text2, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { backgroundColor: C.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  disclaimer: { color: C.text3, fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 16 },
});
