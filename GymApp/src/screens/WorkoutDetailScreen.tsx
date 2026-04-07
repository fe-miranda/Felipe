import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { usePlan } from '../hooks/usePlan';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WorkoutDetail'>;
  route: RouteProp<RootStackParamList, 'WorkoutDetail'>;
};

export function WorkoutDetailScreen({ route }: Props) {
  const { monthIndex, weekIndex, dayIndex } = route.params;
  const { plan, loadStoredPlan } = usePlan();

  useEffect(() => {
    loadStoredPlan();
  }, []);

  if (!plan) return null;

  const month = plan.monthlyBlocks[monthIndex];
  const week = month.weeks[weekIndex];
  const day = week.days[dayIndex];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.breadcrumb}>
          {month.monthName} · Semana {week.week}
        </Text>
        <Text style={styles.dayName}>{day.dayOfWeek}</Text>
        <View style={styles.focusBadge}>
          <Text style={styles.focusText}>{day.focus}</Text>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>⏱ {day.duration} min</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>💪 {day.exercises.length} exercícios</Text>
          </View>
        </View>
      </View>

      {/* Day Notes */}
      {day.notes && (
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>📝 Observações</Text>
          <Text style={styles.notesText}>{day.notes}</Text>
        </View>
      )}

      {/* Exercises */}
      <Text style={styles.sectionTitle}>Exercícios</Text>
      {day.exercises.map((exercise, idx) => (
        <View key={idx} style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseNumber}>
              <Text style={styles.exerciseNumberText}>{idx + 1}</Text>
            </View>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
          </View>

          <View style={styles.exerciseStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{exercise.sets}</Text>
              <Text style={styles.statLabel}>Séries</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{exercise.reps}</Text>
              <Text style={styles.statLabel}>Reps</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{exercise.rest}</Text>
              <Text style={styles.statLabel}>Descanso</Text>
            </View>
          </View>

          {exercise.notes && (
            <View style={styles.exerciseNotes}>
              <Text style={styles.exerciseNotesText}>💡 {exercise.notes}</Text>
            </View>
          )}
        </View>
      ))}

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📊 Resumo do Treino</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Duração estimada</Text>
          <Text style={styles.summaryValue}>{day.duration} minutos</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total de exercícios</Text>
          <Text style={styles.summaryValue}>{day.exercises.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total de séries</Text>
          <Text style={styles.summaryValue}>
            {day.exercises.reduce((acc, ex) => acc + ex.sets, 0)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f14' },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    backgroundColor: '#1a0f3a',
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6c47ff44',
  },
  breadcrumb: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },
  dayName: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 6 },
  focusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#6c47ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 12,
  },
  focusText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  metaRow: { flexDirection: 'row', gap: 8 },
  metaChip: {
    backgroundColor: '#0f0f14',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  metaText: { color: '#bbb', fontSize: 13 },
  notesCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  notesTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 8 },
  notesText: { color: '#bbb', lineHeight: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  exerciseCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6c47ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseNumberText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  exerciseName: { color: '#fff', fontWeight: '700', fontSize: 16, flex: 1 },
  exerciseStats: {
    flexDirection: 'row',
    backgroundColor: '#0f0f14',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#a78bfa', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#666', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#2a2a3a' },
  exerciseNotes: {
    backgroundColor: '#1a0f3a',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#6c47ff33',
  },
  exerciseNotesText: { color: '#a78bfa', fontSize: 13, lineHeight: 18 },
  summaryCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  summaryTitle: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 14 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  summaryLabel: { color: '#888', fontSize: 14 },
  summaryValue: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
