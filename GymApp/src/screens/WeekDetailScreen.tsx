import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { usePlan } from '../hooks/usePlan';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WeekDetail'>;
  route: RouteProp<RootStackParamList, 'WeekDetail'>;
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

const FOCUS_ICONS: Record<string, string> = {
  Peito: '🫁', Costas: '🔙', Pernas: '🦵', Glúteos: '🍑',
  Ombros: '🏋️', Bíceps: '💪', Tríceps: '💪', Core: '⭕',
  Cardio: '🏃', 'Full Body': '⚡', Descanso: '😴', default: '🏋️',
};

function focusIcon(focus: string) {
  for (const key of Object.keys(FOCUS_ICONS)) {
    if (focus.toLowerCase().includes(key.toLowerCase())) return FOCUS_ICONS[key];
  }
  return FOCUS_ICONS.default;
}

export function WeekDetailScreen({ navigation, route }: Props) {
  const { monthIndex, weekIndex } = route.params;
  const { plan, loadStoredPlan } = usePlan();
  const insets = useSafeAreaInsets();

  useEffect(() => { loadStoredPlan(); }, []);
  if (!plan) return null;

  const month = plan.monthlyBlocks[monthIndex];
  const week  = month?.weeks?.[weekIndex];
  if (!month || !week) {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, { justifyContent: 'center', flexGrow: 1 }]}>
        <Text style={[s.sectionTitle, { textAlign: 'center' }]}>Semana não encontrada</Text>
        <TouchableOpacity style={[s.dayCard, { alignItems: 'center' }]} onPress={() => navigation.goBack()}>
          <Text style={s.dayFocus}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }
  const phaseColor = PHASE_COLOR(monthIndex);
  const totalExercises = week.days.reduce((a, d) => a + d.exercises.length, 0);
  const totalSets = week.days.reduce((a, d) => a + d.exercises.reduce((b, e) => b + e.sets, 0), 0);

  return (
    <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={[s.header, { borderColor: `${phaseColor}40` }]}>
        <Text style={[s.breadcrumb, { color: phaseColor }]}>{month.monthName} · {month.focus}</Text>
        <Text style={s.weekNum}>Semana {week.week}</Text>
        <Text style={s.weekTheme}>{week.theme}</Text>

        {/* Quick stats */}
        <View style={s.headerStats}>
          {[
            { label: 'Dias', value: String(week.days.length) },
            { label: 'Exercícios', value: String(totalExercises) },
            { label: 'Séries', value: String(totalSets) },
          ].map((stat, i) => (
            <View key={i} style={s.headerStat}>
              <Text style={[s.headerStatValue, { color: phaseColor }]}>{stat.value}</Text>
              <Text style={s.headerStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Goals ── */}
      {week.weeklyGoals.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>🎯 Metas da Semana</Text>
          {week.weeklyGoals.map((goal, i) => (
            <View key={i} style={s.goalRow}>
              <View style={[s.goalNum, { backgroundColor: phaseColor }]}>
                <Text style={s.goalNumText}>{i + 1}</Text>
              </View>
              <Text style={s.goalText}>{goal}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Training days ── */}
      <Text style={s.sectionTitle}>{week.days.length} Treinos desta Semana</Text>

      {week.days.map((day, di) => (
        <TouchableOpacity
          key={di}
          style={s.dayCard}
          onPress={() => navigation.navigate('WorkoutDetail', { monthIndex, weekIndex, dayIndex: di })}
          activeOpacity={0.8}
        >
          {/* Left accent */}
          <View style={[s.dayAccent, { backgroundColor: phaseColor }]} />

          <View style={s.dayHeader}>
            <View style={[s.dayIconWrap, { backgroundColor: `${phaseColor}18` }]}>
              <Text style={s.dayIconEmoji}>{focusIcon(day.focus)}</Text>
            </View>
            <View style={s.dayInfo}>
              <Text style={[s.dayOfWeek, { color: phaseColor }]}>{day.dayOfWeek}</Text>
              <Text style={s.dayFocus}>{day.focus}</Text>
              <View style={s.dayMeta}>
                <Text style={s.dayMetaText}>⏱ {day.duration} min</Text>
                <View style={s.metaSep} />
                <Text style={s.dayMetaText}>💪 {day.exercises.length} exercícios</Text>
              </View>
            </View>
            <View style={[s.arrowBtn, { backgroundColor: `${phaseColor}20` }]}>
              <Text style={[s.arrow, { color: phaseColor }]}>›</Text>
            </View>
          </View>

          {/* Exercise preview chips */}
          <View style={s.exPreview}>
            {day.exercises.slice(0, 3).map((ex, i) => (
              <View key={i} style={s.exChip}>
                <Text style={s.exChipText} numberOfLines={1}>· {ex.name}</Text>
              </View>
            ))}
            {day.exercises.length > 3 && (
              <Text style={[s.moreText, { color: phaseColor }]}>+{day.exercises.length - 3} mais</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
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
  weekNum: { color: C.text1, fontSize: 32, fontWeight: '900' },
  weekTheme: { color: C.text2, fontSize: 14, marginTop: 4, marginBottom: 16, textAlign: 'center' },
  headerStats: { flexDirection: 'row', gap: 24 },
  headerStat: { alignItems: 'center' },
  headerStatValue: { fontSize: 22, fontWeight: '900' },
  headerStatLabel: { color: C.text3, fontSize: 11, marginTop: 2 },

  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  cardTitle: { color: C.text1, fontWeight: '700', fontSize: 15, marginBottom: 12 },
  goalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  goalNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  goalNumText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  goalText: { color: C.text2, flex: 1, lineHeight: 20, fontSize: 14 },

  sectionTitle: { color: C.text1, fontSize: 16, fontWeight: '700', marginBottom: 12 },

  dayCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  dayAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginLeft: 8 },
  dayIconWrap: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  dayIconEmoji: { fontSize: 26 },
  dayInfo: { flex: 1 },
  dayOfWeek: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  dayFocus: { color: C.text1, fontWeight: '700', fontSize: 16, marginTop: 1 },
  dayMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  dayMetaText: { color: C.text3, fontSize: 12 },
  metaSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.text3 },
  arrowBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 20, fontWeight: '700' },
  exPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginLeft: 8 },
  exChip: { backgroundColor: C.elevated, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  exChipText: { color: C.text3, fontSize: 12 },
  moreText: { fontSize: 12, fontWeight: '600', paddingVertical: 4 },
});
