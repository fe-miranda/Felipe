import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { usePlan } from '../hooks/usePlan';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WeekDetail'>;
  route: RouteProp<RootStackParamList, 'WeekDetail'>;
};

const FOCUS_ICONS: Record<string, string> = {
  'Peito': '🫁',
  'Costas': '🔙',
  'Pernas': '🦵',
  'Ombros': '💪',
  'Bíceps': '💪',
  'Tríceps': '💪',
  'Core': '⭕',
  'Cardio': '🏃',
  'Full Body': '⚡',
  'default': '🏋️',
};

function getFocusIcon(focus: string): string {
  for (const key of Object.keys(FOCUS_ICONS)) {
    if (focus.includes(key)) return FOCUS_ICONS[key];
  }
  return FOCUS_ICONS['default'];
}

export function WeekDetailScreen({ navigation, route }: Props) {
  const { monthIndex, weekIndex } = route.params;
  const { plan, loadStoredPlan } = usePlan();

  useEffect(() => {
    loadStoredPlan();
  }, []);

  if (!plan) return null;

  const month = plan.monthlyBlocks[monthIndex];
  const week = month.weeks[weekIndex];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.monthLabel}>{month.monthName}</Text>
        <Text style={styles.weekTitle}>Semana {week.week}</Text>
        <Text style={styles.weekTheme}>{week.theme}</Text>
      </View>

      {/* Weekly Goals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Metas da Semana</Text>
        {week.weeklyGoals.map((goal, i) => (
          <View key={i} style={styles.goalRow}>
            <Text style={styles.goalNumber}>{i + 1}</Text>
            <Text style={styles.goalText}>{goal}</Text>
          </View>
        ))}
      </View>

      {/* Training Days */}
      <Text style={styles.sectionTitle}>
        {week.days.length} Treinos desta Semana
      </Text>

      {week.days.map((day, dayIdx) => (
        <TouchableOpacity
          key={dayIdx}
          style={styles.dayCard}
          onPress={() =>
            navigation.navigate('WorkoutDetail', {
              monthIndex,
              weekIndex,
              dayIndex: dayIdx,
            })
          }
        >
          <View style={styles.dayHeader}>
            <View style={styles.dayIcon}>
              <Text style={styles.dayIconText}>{getFocusIcon(day.focus)}</Text>
            </View>
            <View style={styles.dayInfo}>
              <Text style={styles.dayName}>{day.dayOfWeek}</Text>
              <Text style={styles.dayFocus}>{day.focus}</Text>
              <Text style={styles.dayMeta}>
                ⏱ {day.duration} min  •  {day.exercises.length} exercícios
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </View>

          {/* Exercise Preview */}
          <View style={styles.exercisePreview}>
            {day.exercises.slice(0, 3).map((ex, i) => (
              <Text key={i} style={styles.exercisePreviewText} numberOfLines={1}>
                · {ex.name}
              </Text>
            ))}
            {day.exercises.length > 3 && (
              <Text style={styles.moreText}>
                +{day.exercises.length - 3} mais
              </Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f14' },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    backgroundColor: '#1a0f3a',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6c47ff44',
  },
  monthLabel: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },
  weekTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 4 },
  weekTheme: { color: '#888', fontSize: 14, marginTop: 6 },
  card: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 12 },
  goalRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  goalNumber: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    backgroundColor: '#6c47ff',
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
  },
  goalText: { color: '#bbb', flex: 1, lineHeight: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  dayCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dayIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1a0f3a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#6c47ff44',
  },
  dayIconText: { fontSize: 24 },
  dayInfo: { flex: 1 },
  dayName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dayFocus: { color: '#a78bfa', fontSize: 13, marginTop: 2 },
  dayMeta: { color: '#666', fontSize: 12, marginTop: 4 },
  arrow: { color: '#444', fontSize: 22 },
  exercisePreview: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a3a',
    paddingTop: 10,
    gap: 4,
  },
  exercisePreviewText: { color: '#666', fontSize: 13 },
  moreText: { color: '#6c47ff', fontSize: 13, marginTop: 4 },
});
