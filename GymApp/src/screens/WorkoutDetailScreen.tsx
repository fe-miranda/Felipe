import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Exercise } from '../types';
import { usePlan } from '../hooks/usePlan';

const SESSIONS_KEY = '@gymapp_sessions_counter';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WorkoutDetail'>;
  route: RouteProp<RootStackParamList, 'WorkoutDetail'>;
};

interface EditState {
  exerciseIndex: number;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
}

export function WorkoutDetailScreen({ navigation, route }: Props) {
  const { monthIndex, weekIndex, dayIndex } = route.params;
  const { plan, loadStoredPlan, savePlan } = usePlan();

  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadStoredPlan();
  }, []);

  if (!plan) return null;

  const month = plan.monthlyBlocks[monthIndex];
  const week = month.weeks[weekIndex];
  const day = week.days[dayIndex];

  const openEdit = (idx: number, exercise: Exercise) => {
    setEditState({
      exerciseIndex: idx,
      name: exercise.name,
      sets: String(exercise.sets),
      reps: exercise.reps,
      rest: exercise.rest,
      notes: exercise.notes ?? '',
    });
  };

  const closeEdit = () => setEditState(null);

  const handleSaveEdit = async () => {
    if (!editState || !plan) return;

    const setsNum = parseInt(editState.sets, 10);
    if (!editState.name.trim() || isNaN(setsNum) || setsNum < 1) {
      Alert.alert('Atenção', 'Preencha nome e número de séries válido.');
      return;
    }

    setSaving(true);
    try {
      const updatedPlan = JSON.parse(JSON.stringify(plan));
      const exercise =
        updatedPlan.monthlyBlocks[monthIndex].weeks[weekIndex].days[dayIndex]
          .exercises[editState.exerciseIndex];

      exercise.name = editState.name.trim();
      exercise.sets = setsNum;
      exercise.reps = editState.reps.trim() || exercise.reps;
      exercise.rest = editState.rest.trim() || exercise.rest;
      exercise.notes = editState.notes.trim() || undefined;

      await savePlan(updatedPlan);
      setEditState(null);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDone = async () => {
    try {
      const current = await AsyncStorage.getItem(SESSIONS_KEY);
      const count = current !== null ? parseInt(current, 10) || 0 : null;
      if (count !== null) {
        const next = Math.max(0, count - 1);
        await AsyncStorage.setItem(SESSIONS_KEY, String(next));
      }
      setCompleted(true);
      Alert.alert(
        '�� Treino Concluído!',
        'Ótimo trabalho! Continue assim.',
        [{ text: 'Continuar', onPress: () => navigation.goBack() }]
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar a conclusão.');
    }
  };

  return (
    <>
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
        <View style={styles.exercisesSectionHeader}>
          <Text style={styles.sectionTitle}>Exercícios</Text>
          <Text style={styles.editHint}>Toque em ✏️ para editar</Text>
        </View>

        {day.exercises.map((exercise, idx) => (
          <View key={idx} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseNumber}>
                <Text style={styles.exerciseNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => openEdit(idx, exercise)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.editBtnText}>✏️</Text>
              </TouchableOpacity>
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

        {/* Mark Done Button */}
        <TouchableOpacity
          style={[styles.doneBtn, completed && styles.doneBtnDone]}
          onPress={handleMarkDone}
          disabled={completed}
        >
          <Text style={styles.doneBtnText}>
            {completed ? '✓ Treino Concluído' : '🏁 Marcar como Concluído'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Exercise Modal */}
      <Modal
        visible={editState !== null}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Editar Exercício</Text>
              <TouchableOpacity onPress={closeEdit} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {editState && (
              <>
                <Text style={styles.fieldLabel}>Nome do Exercício</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editState.name}
                  onChangeText={(v) => setEditState({ ...editState, name: v })}
                  placeholder="Nome"
                  placeholderTextColor="#555"
                />

                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>Séries</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={editState.sets}
                      onChangeText={(v) => setEditState({ ...editState, sets: v })}
                      keyboardType="numeric"
                      placeholder="3"
                      placeholderTextColor="#555"
                    />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>Repetições</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={editState.reps}
                      onChangeText={(v) => setEditState({ ...editState, reps: v })}
                      placeholder="10-12"
                      placeholderTextColor="#555"
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Descanso</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editState.rest}
                  onChangeText={(v) => setEditState({ ...editState, rest: v })}
                  placeholder="60s"
                  placeholderTextColor="#555"
                />

                <Text style={styles.fieldLabel}>Observações (opcional)</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldTextarea]}
                  value={editState.notes}
                  onChangeText={(v) => setEditState({ ...editState, notes: v })}
                  placeholder="Dica ou observação..."
                  placeholderTextColor="#555"
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSaveEdit}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>
                    {saving ? 'Salvando...' : '💾 Salvar Alterações'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
  exercisesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  editHint: { color: '#555', fontSize: 12 },
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
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a0f3a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6c47ff44',
  },
  editBtnText: { fontSize: 16 },
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
    marginBottom: 16,
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
  doneBtn: {
    backgroundColor: '#6c47ff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  doneBtnDone: { backgroundColor: '#65a30d' },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Edit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1a1a24',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: '#2a2a3a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { color: '#aaa', fontSize: 16, fontWeight: '700' },
  fieldLabel: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  fieldInput: {
    backgroundColor: '#0f0f14',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    marginBottom: 4,
  },
  fieldTextarea: { height: 72, textAlignVertical: 'top' },
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldHalf: { flex: 1 },
  saveBtn: {
    backgroundColor: '#6c47ff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
